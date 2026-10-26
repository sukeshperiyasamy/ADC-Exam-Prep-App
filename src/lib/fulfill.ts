import { PaymentProvider, Tier } from '@prisma/client';
import { db } from './db';
import { sendPurchaseEmail } from './mail';
import { tierLabel } from './utils';
import { getDelayDays } from './scheduling/voucher-delivery';
import { issueInvoiceForOrder } from './invoice/issue';
import { renderInvoicePdf } from './invoice/render-invoice-pdf';
import { buildInvoiceLines } from './invoice/build-lines';
import { orderEntitlementKeys } from './payments/order-entitlements';

function providerLabel(p: PaymentProvider): string {
  switch (p) {
    case 'PAYPAL': return 'PayPal';
    case 'PAYNOW': return 'PayNow';
    case 'HITPAY': return 'HitPay';
    case 'STRIPE': return 'Stripe';
    case 'TEST': return 'Test';
    case 'CASHFREE': return 'Cashfree';
  }
}

type EmailSpec = {
  to: string;
  productName: string;
  tier: string;
  voucherPending: boolean;
  invoiceId: string;
  invoiceNumber: string;
  extras: {
    order: { id: string; amount: number; currency: string };
    user: { name: string | null; email: string };
    paymentMethod: string;
  };
};

export type FulfillAudit = { source: string; actorId?: string | null; detail?: Record<string, unknown> };

export async function fulfillOrder(orderId: string, paypalPayload: any, paypalCaptureId: string, audit?: FulfillAudit) {
  // Fetch the voucher delivery delay once before opening the transaction so
  // we don't make extra DB calls per granted VOUCHER entitlement inside it.
  const delayDays = await getDelayDays();
  const scheduledFor = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000);

  const result = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        exam: true,
        user: true,
        bundle: { include: { items: { include: { exam: { include: { vendor: true } } } } } }
      }
    });
    if (!order) throw new Error('Order missing');
    if (order.status === 'PAID') return { order, emailSpec: null as EmailSpec | null };

    // Atomic, conditional flip. Postgres row-locks the order for this UPDATE,
    // so when two webhooks/returns race, the second waits, re-checks the
    // WHERE clause, matches 0 rows and exits without granting anything again.
    // Only PENDING/FAILED orders can become PAID: a late "success" can never
    // re-activate a REFUNDED order (a FAILED order can still be paid by a
    // later successful retry of the same gateway order).
    const flipped = await tx.order.updateMany({
      where: { id: orderId, status: { in: ['PENDING', 'FAILED'] } },
      data: { status: 'PAID', paypalCaptureId, paypalPayload, capturedAt: new Date() }
    });
    if (flipped.count === 0) return { order, emailSpec: null as EmailSpec | null };
    await tx.paymentStateChange.create({
      data: {
        orderId,
        provider: order.provider,
        fromStatus: order.status,
        toStatus: 'PAID',
        source: audit?.source ?? 'fulfill',
        actorId: audit?.actorId ?? null,
        detail: (audit?.detail ?? { captureId: paypalCaptureId }) as any
      }
    });

    // Voucher delivery model: VOUCHER-tier entitlements are created with
    // `voucher: null` (pending). An admin issues the real code later via
    // /admin-dashboard/vouchers. The buyer is told "3-5 business days" up front.

    // Bundle orders: write one entitlement per qualifying bundle item.
    let voucherPending = false;
    let productName = '';
    let tierText = '';

    if (order.bundleId && order.bundle) {
      // Same rule revokeOrderEntitlements() uses on refund.
      const items = orderEntitlementKeys(order);
      for (const item of items) {
        const ent = await tx.entitlement.upsert({
          where: { userId_examId_tier: { userId: order.userId, examId: item.examId, tier: item.tier } },
          update: {},
          create: { userId: order.userId, examId: item.examId, tier: item.tier, voucher: null }
        });
        if (item.tier === 'VOUCHER') {
          voucherPending = true;
          await tx.voucherDelivery.upsert({
            where: { entitlementId: ent.id },
            create: { entitlementId: ent.id, orderId: order.id, scheduledFor, status: 'SCHEDULED' },
            update: {}
          });
        }
      }
      productName = order.bundle.title;
      tierText = 'Bundle';
    } else {
      // Single-exam order.
      if (!order.examId || !order.tier || !order.exam) {
        throw new Error('Order has neither bundleId nor examId+tier');
      }
      const tiersToGrant: Tier[] = orderEntitlementKeys(order).map((k) => k.tier);
      for (const tier of tiersToGrant) {
        const ent = await tx.entitlement.upsert({
          where: { userId_examId_tier: { userId: order.userId, examId: order.examId, tier } },
          update: {},
          create: { userId: order.userId, examId: order.examId, tier, voucher: null }
        });
        if (tier === 'VOUCHER') {
          await tx.voucherDelivery.upsert({
            where: { entitlementId: ent.id },
            create: { entitlementId: ent.id, orderId: order.id, scheduledFor, status: 'SCHEDULED' },
            update: {}
          });
        }
      }
      voucherPending = tiersToGrant.includes('VOUCHER');
      productName = order.exam.title;
      tierText = tierLabel(order.tier);
    }

    // Issue invoice inside the same transaction so the row exists atomically
    // with the PAID flip. Idempotent via Invoice.orderId uniqueness.
    const invoice = await issueInvoiceForOrder(order.id, tx);

    const emailSpec: EmailSpec = {
      to: order.user.email,
      productName,
      tier: tierText,
      voucherPending,
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      extras: {
        order: { id: order.id, amount: order.amount, currency: order.currency },
        user: { name: order.user.name, email: order.user.email },
        paymentMethod: providerLabel(order.provider)
      }
    };
    return { order, emailSpec };
  });

  // Render the invoice PDF + send the purchase email *after* the transaction
  // commits so a slow PDF render or SMTP hop never holds DB locks.
  const { order, emailSpec } = result;
  if (emailSpec) {
    try {
      const invoice = await db.invoice.findUnique({
        where: { id: emailSpec.invoiceId },
        include: { order: { select: { number: true } } }
      });
      let invoicePdf: Buffer | undefined;
      if (invoice) {
        const lines = await buildInvoiceLines(invoice);
        invoicePdf = await renderInvoicePdf({ invoice, lines, orderNumber: invoice.order.number });
      }
      await sendPurchaseEmail(
        emailSpec.to,
        emailSpec.productName,
        emailSpec.tier,
        undefined,
        undefined,
        emailSpec.voucherPending,
        emailSpec.extras,
        invoicePdf && invoice
          ? { invoicePdf, invoiceNumber: invoice.number }
          : undefined
      );
    } catch {
      // Email + PDF must never break fulfilment.
    }
  }
  return order;
}

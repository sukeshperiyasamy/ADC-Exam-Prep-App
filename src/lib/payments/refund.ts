import { db } from '@/lib/db';
import { refundCapture as paypalRefundCapture } from '@/lib/paypal';
import { refundPayment as hitpayRefundPayment } from '@/lib/payments/hitpay';
import { issueCreditNoteForInvoice } from '@/lib/invoice/issue';
import { getSetting } from '@/lib/settings';
import Stripe from 'stripe';
import type { PaymentProvider } from '@prisma/client';
import { requireCashfreeConfig, createCashfreeRefund } from '@/lib/payments/cashfree';
import { revokeOrderEntitlements, type RevokeResult } from '@/lib/payments/order-entitlements';

export type RefundInput = {
  orderId: string;
  amountCents: number;
  reason?: string | null;
  byAdminId: string;
  /** Free-text bank/manual reference for PayNow/TEST orders. */
  manualRef?: string | null;
};

export type RefundOutcome = {
  ok: boolean;
  refundId?: string;
  providerRefundId?: string | null;
  status: 'SUCCEEDED' | 'FAILED' | 'PENDING';
  message?: string;
  fullyRefunded?: boolean;
};

/**
 * Unified refund flow. Routes through the appropriate provider, persists a
 * Refund row, updates Order aggregates, mints a credit-note Invoice, and
 * writes an AdminLog entry. Safe to call from a server action or admin route.
 */
export async function refundOrder(input: RefundInput): Promise<RefundOutcome> {
  const { orderId, amountCents, reason, byAdminId, manualRef } = input;

  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return { ok: false, status: 'FAILED', message: 'Amount must be positive cents.' };
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { invoice: true, refunds: true }
  });
  if (!order) return { ok: false, status: 'FAILED', message: 'Order not found.' };
  if (order.status !== 'PAID') {
    return { ok: false, status: 'FAILED', message: 'Only PAID orders can be refunded.' };
  }

  // PENDING refunds (e.g. Cashfree processing) reserve their amount so an
  // admin can't over-refund while the first refund is still settling.
  const alreadyRefunded = order.refunds
    .filter((r) => r.status === 'SUCCEEDED' || r.status === 'PENDING')
    .reduce((sum, r) => sum + r.amount, 0);
  const remaining = order.amount - alreadyRefunded;
  if (amountCents > remaining) {
    return {
      ok: false,
      status: 'FAILED',
      message: `Refund amount exceeds remaining balance (${remaining / 100} ${order.currency}).`
    };
  }

  // 1. Provider-side refund call
  let providerRefundId: string | null = null;
  let providerStatus: 'SUCCEEDED' | 'FAILED' | 'PENDING' = 'SUCCEEDED';
  let failureMessage: string | undefined;
  try {
    const result = await callProviderRefund(
      order.provider as PaymentProvider,
      {
        orderId: order.id,
        captureId: order.paypalCaptureId || order.providerCaptureId || null,
        providerOrderId: order.providerOrderId || order.paypalOrderId || null,
        amountCents,
        currency: order.currency,
        reason: reason ?? undefined,
        manualRef: manualRef ?? null
      }
    );
    providerRefundId = result.providerRefundId;
    providerStatus = result.status;
  } catch (err: any) {
    providerStatus = 'FAILED';
    failureMessage = String(err?.message ?? err);
  }

  // 2. Insert Refund row (even on failure, so admins can see the audit trail).
  const refund = await db.refund.create({
    data: {
      orderId: order.id,
      amount: amountCents,
      currency: order.currency,
      reason: reason ?? null,
      provider: order.provider,
      providerRefundId: providerRefundId,
      byAdminId,
      status: providerStatus,
      failureMessage
    }
  });

  if (providerStatus !== 'SUCCEEDED') {
    await db.adminLog.create({
      data: {
        adminId: byAdminId,
        action: providerStatus === 'PENDING' ? 'order.refund.pending' : 'order.refund.failed',
        targetType: 'Order',
        targetId: order.id,
        metadata: { refundId: refund.id, providerRefundId, amountCents, provider: order.provider, error: failureMessage ?? null }
      }
    });
    return {
      ok: false,
      refundId: refund.id,
      providerRefundId,
      status: providerStatus,
      message: failureMessage
    };
  }

  const fin = await finalizeSucceededRefund(refund.id);
  return {
    ok: true,
    refundId: refund.id,
    providerRefundId,
    status: 'SUCCEEDED',
    fullyRefunded: fin.fullyRefunded
  };
}

/**
 * Apply a refund that is now SUCCEEDED: recompute the order's refunded total
 * from all succeeded refunds, flip the order to REFUNDED on full refund and
 * revoke the access it granted, mint the credit note, and audit it.
 * Idempotent per refund (guarded by `creditNoteInvoiceId` / the conditional
 * status update), so a webhook + reconciliation race can't double-apply.
 * Used by refundOrder (synchronous success) and by Cashfree refund
 * reconciliation (PENDING -> SUCCESS later).
 */
export async function finalizeSucceededRefund(refundId: string): Promise<{ fullyRefunded: boolean; revoke?: RevokeResult }> {
  const refund = await db.refund.findUniqueOrThrow({ where: { id: refundId } });
  if (refund.status !== 'SUCCEEDED') throw new Error('Refund is not SUCCEEDED');

  const result = await db.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: refund.orderId }, include: { refunds: true } });
    const cumulative = order.refunds.filter((r) => r.status === 'SUCCEEDED').reduce((sum, r) => sum + r.amount, 0);
    const fully = cumulative >= order.amount;
    const becameRefunded = fully
      ? (await tx.order.updateMany({ where: { id: order.id, status: 'PAID' }, data: { status: 'REFUNDED', refundedAt: new Date() } })).count === 1
      : false;
    await tx.order.update({
      where: { id: order.id },
      data: {
        refundAmount: cumulative,
        refundReason: refund.reason ?? order.refundReason,
        refundRef: refund.providerRefundId || order.refundRef
      }
    });
    let revoke: RevokeResult | undefined;
    if (becameRefunded) {
      revoke = await revokeOrderEntitlements(tx, order.id);
      await tx.paymentStateChange.create({
        data: {
          orderId: order.id,
          provider: order.provider,
          fromStatus: 'PAID',
          toStatus: 'REFUNDED',
          source: 'refund',
          actorId: refund.byAdminId,
          detail: { refundId: refund.id, cumulative, revoke } as any
        }
      });
    }
    return { order, cumulative, fully, revoke };
  });
  const { order, cumulative, fully, revoke } = result;

  // Mint credit-note Invoice linked to this refund (once).
  let creditNoteInvoiceId: string | undefined = refund.creditNoteInvoiceId ?? undefined;
  const invoice = await db.invoice.findUnique({ where: { orderId: order.id } });
  if (invoice && !creditNoteInvoiceId) {
    try {
      const cn = await issueCreditNoteForInvoice(invoice.id, refund.amount);
      creditNoteInvoiceId = cn.id;
      await db.refund.update({ where: { id: refund.id }, data: { creditNoteInvoiceId: cn.id } });
    } catch (err) {
      // The refund itself succeeded; missing credit note is recoverable but
      // we still surface it in the admin log so an admin can mint manually.
      await db.adminLog.create({
        data: {
          adminId: refund.byAdminId,
          action: 'invoice.credit-note.failed',
          targetType: 'Invoice',
          targetId: invoice.id,
          metadata: { error: String((err as Error)?.message ?? err), refundId: refund.id }
        }
      });
    }
  }

  await db.adminLog.create({
    data: {
      adminId: refund.byAdminId,
      action: 'order.refund',
      targetType: 'Order',
      targetId: order.id,
      metadata: {
        refundId: refund.id,
        providerRefundId: refund.providerRefundId,
        amountCents: refund.amount,
        cumulativeRefunded: cumulative,
        fullyRefunded: fully,
        reason: refund.reason ?? null,
        creditNoteInvoiceId: creditNoteInvoiceId ?? null,
        accessRevoked: revoke ?? null
      }
    }
  });

  try {
    const { notify } = await import('@/lib/admin-notifications');
    await notify({
      kind: 'order.refund',
      title: `${fully ? 'Full' : 'Partial'} refund · ${(refund.amount / 100).toFixed(2)} ${order.currency}`,
      body: `Order ${order.number ?? order.id.slice(0, 8)} refunded${refund.reason ? ` — ${refund.reason}` : ''}${revoke?.keptVoucherIssued.length ? ' — voucher already issued, review access manually' : ''}`,
      link: `/admin-dashboard/orders/${order.id}`
    });
  } catch {
    /* never break refund flow */
  }
  return { fullyRefunded: fully, revoke };
}

async function callProviderRefund(
  provider: PaymentProvider,
  input: {
    orderId: string;
    captureId: string | null;
    providerOrderId: string | null;
    amountCents: number;
    currency: string;
    reason?: string;
    manualRef?: string | null;
  }
): Promise<{ providerRefundId: string | null; status: 'SUCCEEDED' | 'FAILED' | 'PENDING' }> {
  switch (provider) {
    case 'PAYPAL': {
      if (!input.captureId) throw new Error('Order has no PayPal capture id to refund.');
      const result = await paypalRefundCapture(input.captureId, input.amountCents, input.currency, input.reason);
      const status = result.status === 'COMPLETED' ? 'SUCCEEDED' : result.status === 'PENDING' ? 'PENDING' : 'FAILED';
      return { providerRefundId: result.id, status };
    }
    case 'HITPAY': {
      // HitPay uses the payment request id we stored as providerOrderId.
      if (!input.providerOrderId) throw new Error('Order has no HitPay payment id to refund.');
      const result = await hitpayRefundPayment(input.providerOrderId, input.amountCents);
      const status = result.status === 'succeeded' || result.status === 'completed' ? 'SUCCEEDED' : 'PENDING';
      return { providerRefundId: result.id, status };
    }
    case 'STRIPE': {
      if (!input.captureId && !input.providerOrderId) {
        throw new Error('Order has no Stripe payment intent to refund.');
      }
      const secretKey = await getSetting('STRIPE_SECRET_KEY');
      if (!secretKey) throw new Error('STRIPE_SECRET_KEY not configured');
      const stripe = new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' as any });
      const refund = await stripe.refunds.create({
        payment_intent: input.captureId || undefined,
        amount: input.amountCents,
        reason: input.reason as any
      });
      const status = refund.status === 'succeeded' ? 'SUCCEEDED' : refund.status === 'pending' ? 'PENDING' : 'FAILED';
      return { providerRefundId: refund.id, status };
    }
    case 'CASHFREE': {
      // Cashfree refunds are keyed by OUR order id (we use it as order_id) and
      // a merchant refund_id (3-40 alphanumeric). Store the merchant refund_id
      // so refund webhooks / reconciliation can find this row.
      const c = await requireCashfreeConfig();
      const refundId = `RF${input.orderId.replace(/[^A-Za-z0-9]/g, '')}${Date.now().toString(36)}`.slice(0, 40);
      const r = await createCashfreeRefund(c, input.orderId, refundId, input.amountCents, input.reason);
      const status = r.refund_status === 'SUCCESS' ? 'SUCCEEDED' : r.refund_status === 'CANCELLED' || r.refund_status === 'REJECTED' ? 'FAILED' : 'PENDING';
      return { providerRefundId: r.refund_id || refundId, status };
    }
    case 'PAYNOW':
    case 'TEST': {
      // No provider API — admin records a manual reference. We mark
      // SUCCEEDED immediately; the admin is asserting they processed it
      // out-of-band (bank transfer for PayNow, no-op for TEST).
      return { providerRefundId: input.manualRef ?? null, status: 'SUCCEEDED' };
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

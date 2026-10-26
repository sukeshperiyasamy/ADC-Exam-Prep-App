import crypto from 'node:crypto';
import { Prisma, type Order } from '@prisma/client';
import { db } from '@/lib/db';
import { fulfillOrder } from '@/lib/fulfill';
import { nextNumber } from '@/lib/numbering';
import { evaluateCoupon, recordCouponRedemption } from '@/lib/coupons';
import {
  CashfreeApiError,
  createCashfreeOrder,
  getCashfreeConfig,
  getCashfreeOrder,
  getCashfreePayments,
  getCashfreeRefunds,
  normalizeIndianPhone,
  requireCashfreeConfig,
  rupeesToPaise,
  verifyWebhookSignature,
  type CashfreeConfig,
  type CfOrder,
  type CfPayment
} from './cashfree';
import { logWebhookReceived, markWebhookFailed, markWebhookIgnored, markWebhookProcessed } from './webhook-log';
import { finalizeSucceededRefund } from './refund';
import { revokeOrderEntitlements } from './order-entitlements';

/** How long a Cashfree checkout session stays payable. */
export const CHECKOUT_TTL_MS = 30 * 60_000;
/** Don't hand out a session that is about to expire. */
const RESUME_MIN_REMAINING_MS = 5 * 60_000;
/** A just-created order without a session yet = another request is mid-flight. */
const IN_FLIGHT_MS = 60_000;

export class CheckoutError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

async function recordState(
  tx: Prisma.TransactionClient | typeof db,
  order: Pick<Order, 'id' | 'provider'>,
  fromStatus: string | null,
  toStatus: string,
  source: string,
  detail?: Record<string, unknown>,
  actorId?: string | null
) {
  await tx.paymentStateChange.create({
    data: { orderId: order.id, provider: order.provider, fromStatus, toStatus, source, actorId: actorId ?? null, detail: (detail ?? {}) as Prisma.InputJsonValue }
  });
}

async function notifyAdmins(title: string, body: string, orderId: string) {
  try {
    const { notify } = await import('@/lib/admin-notifications');
    await notify({ kind: 'payment.attention', title, body, link: `/admin-dashboard/orders/${orderId}` });
  } catch {
    /* never break payment processing */
  }
}

// ---------------------------------------------------------------------------
// Pricing — authoritative, server-side only
// ---------------------------------------------------------------------------

export async function priceBundleOrder(input: { userId: string; bundleId: string; tier?: 'PRACTICE' | 'VOUCHER'; couponCode?: string | null }) {
  const bundle = await db.bundle.findUnique({
    where: { id: input.bundleId },
    include: { items: { take: 1, include: { exam: { select: { vendorId: true } } } } }
  });
  if (!bundle || !bundle.published) throw new CheckoutError('not-found', 'This product is not available.', 404);
  let amount: number;
  let tier: 'PRACTICE' | 'VOUCHER';
  if (input.tier === 'VOUCHER' && bundle.priceVoucher != null) {
    amount = bundle.priceVoucher;
    tier = 'VOUCHER';
  } else {
    amount = bundle.price;
    tier = 'PRACTICE';
  }
  let couponId: string | null = null;
  let discount = 0;
  if (input.couponCode) {
    const r = await evaluateCoupon({
      code: input.couponCode,
      userId: input.userId,
      examId: null,
      bundleId: bundle.id,
      vendorId: bundle.items[0]?.exam.vendorId ?? null,
      subtotalCents: amount
    });
    if (!r.ok) throw new CheckoutError('coupon_invalid', r.message ?? 'This promo code cannot be applied.');
    couponId = r.couponId;
    discount = r.discountCents;
    amount = Math.max(0, amount - discount);
  }
  return { bundle, amount, tier, couponId, discount, currency: 'INR' as const };
}

// ---------------------------------------------------------------------------
// Checkout start (with resume + double-submit protection)
// ---------------------------------------------------------------------------

export type StartCheckoutInput = {
  user: { id: string; email: string; name?: string | null };
  bundleId: string;
  tier?: 'PRACTICE' | 'VOUCHER';
  billingAddressId?: string | null;
  couponCode?: string | null;
  phone?: string | null;
  appUrl: string;
};

export type StartCheckoutResult =
  | { kind: 'session'; orderId: string; paymentSessionId: string; sdkMode: 'sandbox' | 'production'; resumed: boolean }
  | { kind: 'already-paid'; orderId: string };

export async function startCashfreeCheckout(i: StartCheckoutInput): Promise<StartCheckoutResult> {
  const c = await requireCashfreeConfig().catch((e) => {
    throw new CheckoutError('cashfree-unavailable', e.message, 503);
  });

  let address: { phone: string | null } | null = null;
  if (i.billingAddressId) {
    const a = await db.billingAddress.findUnique({ where: { id: i.billingAddressId } });
    if (!a || a.userId !== i.user.id) throw new CheckoutError('invalid-address', 'Invalid billing address.');
    address = a;
  }
  const phone = normalizeIndianPhone(i.phone) ?? normalizeIndianPhone(address?.phone);
  if (!phone) throw new CheckoutError('phone_required', 'Enter a valid 10-digit Indian mobile number (required by Cashfree).');

  const price = await priceBundleOrder({ userId: i.user.id, bundleId: i.bundleId, tier: i.tier, couponCode: i.couponCode });
  if (price.amount < 100) throw new CheckoutError('amount_too_low', 'Cashfree requires a minimum of ₹1. Please contact support for this order.');

  // Serialise checkout starts per user so double-clicks / parallel tabs can't
  // create duplicate orders: everything below runs under a transaction-scoped
  // Postgres advisory lock keyed by the user.
  const decision = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'cashfree-checkout:' + i.user.id}))`;
    const sameProduct = {
      userId: i.user.id,
      provider: 'CASHFREE' as const,
      bundleId: price.bundle.id,
      tier: price.tier,
      amount: price.amount,
      couponId: price.couponId
    };
    const inFlight = await tx.order.findFirst({
      where: { ...sameProduct, status: 'PENDING', providerSessionId: null, providerStatus: null, createdAt: { gt: new Date(Date.now() - IN_FLIGHT_MS) } }
    });
    if (inFlight) return { kind: 'in-flight' as const };
    const resumable = await tx.order.findFirst({
      where: {
        ...sameProduct,
        status: { in: ['PENDING', 'FAILED'] },
        providerSessionId: { not: null },
        providerExpiresAt: { gt: new Date(Date.now() + RESUME_MIN_REMAINING_MS) }
      },
      orderBy: { createdAt: 'desc' }
    });
    if (resumable) return { kind: 'resume' as const, order: resumable };

    const number = await nextNumber('ORDER', 'ORD');
    const created = await tx.order.create({
      data: {
        number,
        userId: i.user.id,
        examId: null,
        bundleId: price.bundle.id,
        tier: price.tier,
        amount: price.amount,
        currency: price.currency,
        status: 'PENDING',
        provider: 'CASHFREE',
        billingAddressId: i.billingAddressId || null,
        couponId: price.couponId,
        discount: price.discount
      }
    });
    if (price.couponId && price.discount > 0) {
      await recordCouponRedemption({ couponId: price.couponId, userId: i.user.id, orderId: created.id, amountCents: price.discount }, tx);
    }
    await recordState(tx, created, null, 'PENDING', 'checkout', { amount: price.amount, currency: price.currency });
    return { kind: 'new' as const, order: created };
  });

  if (decision.kind === 'in-flight') {
    throw new CheckoutError('checkout_in_progress', 'Your checkout is already being prepared. Please wait a moment.', 409);
  }

  if (decision.kind === 'resume') {
    const o = decision.order;
    try {
      const cf = await getCashfreeOrder(c, o.id);
      if (cf.order_status === 'PAID') {
        await reconcileCashfreeOrder(o.id, 'checkout');
        return { kind: 'already-paid', orderId: o.id };
      }
      if (cf.order_status === 'ACTIVE' && rupeesToPaise(cf.order_amount) === o.amount && cf.payment_session_id) {
        return { kind: 'session', orderId: o.id, paymentSessionId: cf.payment_session_id, sdkMode: c.sdkMode, resumed: true };
      }
      // Expired/terminated: close it and fall through to a fresh order.
      await reconcileCashfreeOrder(o.id, 'checkout');
      await db.order.updateMany({ where: { id: o.id, status: 'PENDING' }, data: { status: 'FAILED', providerStatus: cf.order_status } });
      // Never offer this session again (also guarantees the retry below can't loop).
      await db.order.update({ where: { id: o.id }, data: { providerExpiresAt: new Date() } });
    } catch (e) {
      if (e instanceof CashfreeApiError && e.transient) throw new CheckoutError('gateway_unavailable', 'Payment gateway is not responding. Please try again.', 503);
      throw e;
    }
    // Start over now that the stale order is closed.
    return startCashfreeCheckout(i);
  }

  const order = decision.order;
  const appUrl = i.appUrl.replace(/\/+$/, '');
  const expiresAt = new Date(Date.now() + CHECKOUT_TTL_MS);
  let cf: CfOrder;
  try {
    cf = await createWithRetry(c, {
      orderId: order.id,
      amountPaise: order.amount,
      currency: 'INR',
      customer: { id: i.user.id, phone, email: i.user.email, name: i.user.name },
      returnUrl: `${appUrl}/api/cashfree/return?order_id=${encodeURIComponent(order.id)}`,
      // Cashfree requires https for notify_url; locally rely on dashboard webhooks.
      notifyUrl: appUrl.startsWith('https://') ? `${appUrl}/api/cashfree/webhook` : null,
      expiresAt,
      tags: { order_number: order.number ?? order.id }
    });
  } catch (e: any) {
    await db.$transaction(async (tx) => {
      await tx.couponRedemption.deleteMany({ where: { orderId: order.id } });
      await tx.order.update({ where: { id: order.id }, data: { status: 'FAILED', providerStatus: 'CREATE_FAILED' } });
      await recordState(tx, order, 'PENDING', 'FAILED', 'checkout', { error: String(e?.message ?? e).slice(0, 300) });
    });
    if (e instanceof CashfreeApiError && e.transient) throw new CheckoutError('gateway_unavailable', 'Payment gateway is not responding. Please try again.', 503);
    throw new CheckoutError('gateway_error', 'Could not start the payment. Please try again or contact support.', 502);
  }

  // Never trust the gateway echo blindly: it must be OUR order and amount.
  if (cf.order_id !== order.id || rupeesToPaise(cf.order_amount) !== order.amount || (cf.order_currency || 'INR') !== order.currency || !cf.payment_session_id) {
    await db.order.update({ where: { id: order.id }, data: { status: 'FAILED', providerStatus: 'CREATE_MISMATCH', providerPayload: cf as any } });
    await recordState(db, order, 'PENDING', 'FAILED', 'checkout', { reason: 'gateway order did not match' });
    throw new CheckoutError('gateway_error', 'Payment could not be initialised safely. Please contact support.', 502);
  }

  await db.order.update({
    where: { id: order.id },
    data: {
      providerOrderId: String(cf.cf_order_id),
      providerSessionId: cf.payment_session_id,
      providerExpiresAt: cf.order_expiry_time ? new Date(cf.order_expiry_time) : expiresAt,
      providerStatus: cf.order_status,
      providerPayload: cf as any
    }
  });
  return { kind: 'session', orderId: order.id, paymentSessionId: cf.payment_session_id, sdkMode: c.sdkMode, resumed: false };
}

async function createWithRetry(c: CashfreeConfig, input: Parameters<typeof createCashfreeOrder>[1]): Promise<CfOrder> {
  try {
    return await createCashfreeOrder(c, input);
  } catch (e) {
    // Timeout/5xx: Cashfree may have created it. Same x-idempotency-key makes a
    // retry safe; a 409 "order_already_exists" means fetch what exists.
    if (e instanceof CashfreeApiError && (e.transient || e.status === 409)) {
      if (e.status !== 409) {
        try {
          return await createCashfreeOrder(c, input);
        } catch (e2) {
          if (!(e2 instanceof CashfreeApiError && e2.status === 409)) throw e2;
        }
      }
      return getCashfreeOrder(c, input.orderId);
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Decision: what does Cashfree's authoritative state mean for our order?
// Pure function — unit tested.
// ---------------------------------------------------------------------------

export type Decision =
  | { kind: 'PAID'; payment: CfPayment }
  | { kind: 'FAILED'; reason: string }
  | { kind: 'PENDING'; reason: string }
  | { kind: 'MISMATCH'; reason: string };

const FAILED_PAYMENT = new Set(['FAILED', 'USER_DROPPED', 'CANCELLED', 'VOID']);

export function decideFromCashfree(
  order: { id: string; amount: number; currency: string },
  cfOrder: CfOrder,
  payments: CfPayment[]
): Decision {
  if (cfOrder.order_id !== order.id) return { kind: 'MISMATCH', reason: `order reference ${cfOrder.order_id} != ${order.id}` };
  if (rupeesToPaise(cfOrder.order_amount) !== order.amount)
    return { kind: 'MISMATCH', reason: `order amount ${cfOrder.order_amount} != ${order.amount / 100}` };
  if ((cfOrder.order_currency || '').toUpperCase() !== order.currency.toUpperCase())
    return { kind: 'MISMATCH', reason: `order currency ${cfOrder.order_currency} != ${order.currency}` };

  const mine = payments.filter((p) => !p.order_id || p.order_id === order.id);
  const success = mine.find((p) => p.payment_status === 'SUCCESS');
  if (success) {
    if (rupeesToPaise(success.payment_amount) !== order.amount)
      return { kind: 'MISMATCH', reason: `payment amount ${success.payment_amount} != ${order.amount / 100}` };
    if ((success.payment_currency || '').toUpperCase() !== order.currency.toUpperCase())
      return { kind: 'MISMATCH', reason: `payment currency ${success.payment_currency} != ${order.currency}` };
    if (cfOrder.order_status !== 'PAID') return { kind: 'PENDING', reason: `payment SUCCESS but order ${cfOrder.order_status}` };
    return { kind: 'PAID', payment: success };
  }
  if (mine.some((p) => p.payment_status === 'PENDING')) return { kind: 'PENDING', reason: 'payment pending at bank' };
  if (['EXPIRED', 'TERMINATED', 'TERMINATION_REQUESTED'].includes(cfOrder.order_status))
    return { kind: 'FAILED', reason: `order ${cfOrder.order_status.toLowerCase()}` };
  const latest = [...mine].sort((a, b) => String(b.payment_time ?? '').localeCompare(String(a.payment_time ?? '')))[0];
  if (latest && FAILED_PAYMENT.has(String(latest.payment_status)))
    return { kind: 'FAILED', reason: `payment ${String(latest.payment_status).toLowerCase()}${latest.error_details?.error_description ? `: ${latest.error_details.error_description}` : ''}` };
  return { kind: 'PENDING', reason: latest ? `payment ${latest.payment_status}` : 'no payment attempt yet' };
}

// ---------------------------------------------------------------------------
// Reconciliation — the ONLY path that changes a Cashfree order's status.
// Webhooks, the browser return, status polling and the admin button all call
// this; it always asks Cashfree directly and never trusts the caller's data.
// ---------------------------------------------------------------------------

export type ReconcileResult = {
  orderId: string;
  before: string;
  after: string;
  decision: Decision['kind'];
  reason: string;
  refundsUpdated: number;
};

export async function reconcileCashfreeOrder(orderId: string, source: string, actorId?: string | null): Promise<ReconcileResult> {
  const c = await getCashfreeConfig();
  if (!c.appId || !c.secretKey) throw new Error('Cashfree credentials are not configured');
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.provider !== 'CASHFREE') throw new Error('Not a Cashfree order');

  const [cfOrder, payments] = await Promise.all([getCashfreeOrder(c, order.id), getCashfreePayments(c, order.id)]);
  const d = decideFromCashfree(order, cfOrder, Array.isArray(payments) ? payments : []);
  const common = { providerStatus: cfOrder.order_status, reconciledAt: new Date() };

  if (d.kind === 'PAID') {
    const cfPaymentId = String(d.payment.cf_payment_id);
    await fulfillOrder(order.id, d.payment, `cf_${cfPaymentId}`, {
      source,
      actorId,
      detail: { cfPaymentId, amount: d.payment.payment_amount, currency: d.payment.payment_currency, group: d.payment.payment_group }
    });
    await db.order.update({ where: { id: order.id }, data: { ...common, providerCaptureId: cfPaymentId, providerPayload: { order: cfOrder, payment: d.payment } as any } });
  } else if (d.kind === 'FAILED') {
    await db.$transaction(async (tx) => {
      const r = await tx.order.updateMany({ where: { id: order.id, status: 'PENDING' }, data: { status: 'FAILED', ...common } });
      if (r.count === 1) await recordState(tx, order, 'PENDING', 'FAILED', source, { reason: d.reason }, actorId);
      else await tx.order.update({ where: { id: order.id }, data: common });
    });
  } else if (d.kind === 'MISMATCH') {
    await db.order.update({ where: { id: order.id }, data: common });
    await recordState(db, order, order.status, 'MISMATCH', source, { reason: d.reason }, actorId);
    await notifyAdmins('Cashfree payment mismatch — access NOT granted', `${order.number ?? order.id}: ${d.reason}`, order.id);
  } else {
    await db.order.update({ where: { id: order.id }, data: common });
  }

  const refundsUpdated = await reconcileCashfreeRefunds(c, order.id, source);
  const after = (await db.order.findUniqueOrThrow({ where: { id: order.id }, select: { status: true } })).status;
  if (actorId) {
    await db.adminLog.create({
      data: { adminId: actorId, action: 'order.cashfree.reconcile', targetType: 'Order', targetId: order.id, metadata: { before: order.status, after, decision: d.kind, reason: 'reason' in d ? d.reason : 'paid', cfOrderStatus: cfOrder.order_status } }
    });
  }
  return { orderId: order.id, before: order.status, after, decision: d.kind, reason: 'reason' in d ? d.reason : 'payment SUCCESS verified', refundsUpdated };
}

/** Sync our Refund rows (and gateway-side refunds) with Cashfree. */
async function reconcileCashfreeRefunds(c: CashfreeConfig, orderId: string, source: string): Promise<number> {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { refunds: true } });
  if (order.status !== 'PAID' && order.status !== 'REFUNDED') return 0;
  let cfRefunds;
  try {
    cfRefunds = await getCashfreeRefunds(c, orderId);
  } catch (e) {
    if (e instanceof CashfreeApiError && e.status === 404) return 0;
    throw e;
  }
  if (!Array.isArray(cfRefunds)) return 0;
  let n = 0;
  for (const r of cfRefunds) {
    const local = order.refunds.find((x) => x.providerRefundId === r.refund_id);
    if (!local) continue;
    if (r.refund_status === 'SUCCESS') {
      const flipped = await db.refund.updateMany({ where: { id: local.id, status: 'PENDING' }, data: { status: 'SUCCEEDED', failureMessage: null } });
      if (flipped.count === 1) {
        await finalizeSucceededRefund(local.id);
        n++;
      }
    } else if (r.refund_status === 'CANCELLED' || r.refund_status === 'REJECTED') {
      const flipped = await db.refund.updateMany({ where: { id: local.id, status: 'PENDING' }, data: { status: 'FAILED', failureMessage: `Cashfree refund ${r.refund_status}` } });
      if (flipped.count === 1) {
        n++;
        await notifyAdmins('Cashfree refund failed', `Refund ${r.refund_id} ${r.refund_status}`, orderId);
      }
    }
  }
  // Refunds issued directly in the Cashfree dashboard (no local row). A full
  // external refund must not leave the student with paid access.
  const external = cfRefunds.filter((r) => r.refund_status === 'SUCCESS' && !order.refunds.some((x) => x.providerRefundId === r.refund_id));
  if (external.length) {
    const externalPaise = external.reduce((s, r) => s + rupeesToPaise(r.refund_amount), 0);
    const localPaise = order.refunds.filter((r) => r.status === 'SUCCEEDED').reduce((s, r) => s + r.amount, 0);
    if (externalPaise + localPaise >= order.amount) {
      const changed = await db.$transaction(async (tx) => {
        const r = await tx.order.updateMany({ where: { id: orderId, status: 'PAID' }, data: { status: 'REFUNDED', refundedAt: new Date(), refundAmount: externalPaise + localPaise, refundRef: external.map((x) => x.refund_id).join(',').slice(0, 190) } });
        if (r.count !== 1) return false;
        const revoke = await revokeOrderEntitlements(tx, orderId);
        await recordState(tx, order, 'PAID', 'REFUNDED', source, { external: external.map((x) => x.refund_id), revoke });
        return true;
      });
      if (changed) {
        n++;
        await notifyAdmins('Cashfree dashboard refund applied', `Order ${order.number ?? orderId} fully refunded outside the app; access revoked.`, orderId);
      }
    } else {
      await notifyAdmins('Cashfree partial refund outside the app', `Order ${order.number ?? orderId}: ${externalPaise / 100} INR refunded in the Cashfree dashboard.`, orderId);
    }
  }
  return n;
}

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------

export type WebhookOutcome = { status: number; body: Record<string, unknown> };

const PAYMENT_EVENTS = new Set(['PAYMENT_SUCCESS_WEBHOOK', 'PAYMENT_FAILED_WEBHOOK', 'PAYMENT_USER_DROPPED_WEBHOOK']);
const REFUND_EVENTS = new Set(['REFUND_STATUS_WEBHOOK', 'AUTO_REFUND_STATUS_WEBHOOK']);
const DISPUTE_EVENTS = new Set(['DISPUTE_CREATED', 'DISPUTE_UPDATED', 'DISPUTE_CLOSED']);

export async function handleCashfreeWebhook(rawBody: string, headers: Headers): Promise<WebhookOutcome> {
  const c = await getCashfreeConfig();
  if (!c.secretKey) return { status: 503, body: { error: 'cashfree-not-configured' } };

  const sig = verifyWebhookSignature(rawBody, headers.get('x-webhook-signature'), headers.get('x-webhook-timestamp'), c.secretKey);
  if (!sig.ok) {
    // Not persisted: unauthenticated input must not be able to write rows.
    console.warn(`[cashfree] webhook rejected: ${sig.reason}`);
    return { status: 401, body: { error: 'invalid-signature' } };
  }

  let evt: any;
  try {
    evt = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: 'invalid-json' } };
  }
  const type = String(evt?.type ?? 'unknown');
  const data = evt?.data ?? {};
  const ourOrderId: string | undefined =
    data.order?.order_id ?? data.refund?.order_id ?? data.auto_refund?.order_id ?? data.order_details?.order_id;

  // Dedup key: Cashfree's idempotency header (2025-01-01+), else a hash of
  // the fields that identify this exact state transition.
  const eventId =
    headers.get('x-idempotency-key') ||
    'h_' +
      crypto
        .createHash('sha256')
        .update([type, ourOrderId, data.payment?.cf_payment_id, data.payment?.payment_status, data.refund?.refund_id, data.refund?.refund_status, data.dispute?.dispute_id, data.dispute?.dispute_status].join('|'))
        .digest('hex')
        .slice(0, 40);

  const order = ourOrderId ? await db.order.findUnique({ where: { id: String(ourOrderId) } }) : null;
  const log = await logWebhookReceived({ provider: 'CASHFREE', eventId, eventType: type, payload: evt, orderId: order?.id ?? null });
  if (log.status === 'PROCESSED' || log.status === 'IGNORED') return { status: 200, body: { ok: true, dedup: true } };

  if (!order || order.provider !== 'CASHFREE') {
    // 200 so Cashfree stops retrying an event that isn't ours.
    await markWebhookIgnored(log.id, 'No matching Cashfree order');
    return { status: 200, body: { ok: true, ignored: 'unknown-order' } };
  }

  try {
    if (PAYMENT_EVENTS.has(type)) {
      // Cheap sanity check on the signed payload, then act ONLY on Cashfree's
      // API view (handles out-of-order and replayed events correctly).
      const p = data.payment ?? {};
      if (p.payment_status === 'SUCCESS' && (rupeesToPaise(p.payment_amount) !== order.amount || String(p.payment_currency).toUpperCase() !== order.currency)) {
        await recordState(db, order, order.status, 'MISMATCH', 'webhook', { reason: 'webhook amount/currency mismatch', amount: p.payment_amount, currency: p.payment_currency });
      }
      const r = await reconcileCashfreeOrder(order.id, 'webhook');
      await markWebhookProcessed(log.id, { orderId: order.id });
      return { status: 200, body: { ok: true, status: r.after, decision: r.decision } };
    }
    if (REFUND_EVENTS.has(type)) {
      const r = await reconcileCashfreeOrder(order.id, 'webhook');
      await markWebhookProcessed(log.id, { orderId: order.id });
      return { status: 200, body: { ok: true, refundsUpdated: r.refundsUpdated } };
    }
    if (DISPUTE_EVENTS.has(type)) {
      await applyDispute(order, data, type);
      await markWebhookProcessed(log.id, { orderId: order.id });
      return { status: 200, body: { ok: true } };
    }
    await markWebhookIgnored(log.id, `Event type ${type} not handled`);
    return { status: 200, body: { ok: true, ignored: type } };
  } catch (e: any) {
    await markWebhookFailed(log.id, String(e?.message ?? e));
    // 5xx => Cashfree retries later; reconciliation is idempotent.
    return { status: 500, body: { error: 'processing_failed' } };
  }
}

/** Disputes: record + alert; a LOST/ACCEPTED chargeback reverses access. */
async function applyDispute(order: Order, data: any, type: string) {
  const status = String(data.dispute?.dispute_status ?? type);
  const lost = /_(MERCHANT_LOST|MERCHANT_ACCEPTED)$/.test(status) && !/^RETRIEVAL_/.test(status);
  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id: order.id }, data: { disputeStatus: status } });
    await recordState(tx, order, order.status, `DISPUTE:${status}`, 'dispute', { disputeId: data.dispute?.dispute_id, type: data.dispute?.dispute_type, amount: data.dispute?.dispute_amount });
    if (lost) {
      const r = await tx.order.updateMany({ where: { id: order.id, status: 'PAID' }, data: { status: 'REFUNDED', refundedAt: new Date(), refundAmount: order.amount, refundReason: `Chargeback ${status}` } });
      if (r.count === 1) {
        const revoke = await revokeOrderEntitlements(tx, order.id);
        await recordState(tx, order, 'PAID', 'REFUNDED', 'dispute', { status, revoke });
      }
    }
  });
  await notifyAdmins(`Cashfree dispute ${status}`, `Order ${order.number ?? order.id}${lost ? ' — access revoked' : ''}`, order.id);
}

// ---------------------------------------------------------------------------
// Throttle for user-triggered reconciliation (return page / status polling)
// ---------------------------------------------------------------------------

export async function maybeReconcile(order: Pick<Order, 'id' | 'provider' | 'status' | 'reconciledAt'>, source: string, minIntervalMs = 8000) {
  if (order.provider !== 'CASHFREE' || (order.status !== 'PENDING' && order.status !== 'FAILED')) return null;
  if (order.reconciledAt && Date.now() - order.reconciledAt.getTime() < minIntervalMs) return null;
  // Claim the slot atomically so concurrent polls don't stampede Cashfree.
  const claim = await db.order.updateMany({
    where: { id: order.id, OR: [{ reconciledAt: null }, { reconciledAt: { lt: new Date(Date.now() - minIntervalMs) } }] },
    data: { reconciledAt: new Date() }
  });
  if (claim.count === 0) return null;
  try {
    return await reconcileCashfreeOrder(order.id, source);
  } catch {
    return null; // keep polling; webhook is the safety net
  }
}

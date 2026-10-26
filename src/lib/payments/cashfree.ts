import crypto from 'node:crypto';
import { getSetting } from '@/lib/settings';

/**
 * Cashfree Payment Gateway (PG) REST client — server-only.
 *
 * Docs checked 2026-10-21 (https://www.cashfree.com/docs/api-reference/...):
 *  - Base URLs: sandbox https://sandbox.cashfree.com/pg, production https://api.cashfree.com/pg
 *  - Auth headers: x-client-id / x-client-secret, plus x-api-version
 *  - POST /orders, GET /orders/{id}, GET /orders/{id}/payments,
 *    POST /orders/{id}/refunds, GET /orders/{id}/refunds
 *  - Webhook signature: base64(HMAC-SHA256(x-webhook-timestamp + rawBody, client secret))
 *
 * The client secret never leaves this module: it is only placed in outgoing
 * request headers and used for HMAC verification, never logged or returned.
 */

export const DEFAULT_API_VERSION = '2025-01-01';

export type CashfreeEnv = 'TEST' | 'PROD';

export type CashfreeConfig = {
  enabled: boolean;
  env: CashfreeEnv;
  appId: string;
  secretKey: string;
  apiVersion: string;
  baseUrl: string;
  /** Mode string for the browser JS SDK. Safe to expose. */
  sdkMode: 'sandbox' | 'production';
};

export class CashfreeConfigError extends Error {}

export class CashfreeApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public type?: string
  ) {
    super(message);
  }
  /** Worth retrying (network / rate limit / Cashfree-side error). */
  get transient() {
    return this.status === 0 || this.status === 429 || this.status >= 500;
  }
}

/**
 * Credentials, environment and API version come ONLY from server environment
 * variables (never the admin settings table), so live mode cannot be switched
 * on from the dashboard. The admin toggle CASHFREE_ENABLED can only turn the
 * already-configured gateway on or off.
 */
export async function getCashfreeConfig(): Promise<CashfreeConfig> {
  const enabled = await getSetting('CASHFREE_ENABLED');
  const envRaw = process.env.CASHFREE_ENV ?? '';
  const appId = process.env.CASHFREE_APP_ID ?? '';
  const secretKey = process.env.CASHFREE_SECRET_KEY ?? '';
  const apiVersion = process.env.CASHFREE_API_VERSION ?? '';
  const baseOverride = process.env.CASHFREE_API_BASE ?? '';
  const env: CashfreeEnv = envRaw === 'PROD' ? 'PROD' : 'TEST';
  let baseUrl = env === 'PROD' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
  // Test-only override (local mock server). Never honoured in PROD, and only
  // for loopback hosts, so a mis-set value cannot leak credentials elsewhere.
  if (baseOverride && env === 'TEST' && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/.test(baseOverride)) {
    baseUrl = baseOverride.replace(/\/+$/, '');
  }
  return {
    enabled: enabled === 'true',
    env,
    appId,
    secretKey,
    apiVersion: apiVersion || DEFAULT_API_VERSION,
    baseUrl,
    sdkMode: env === 'PROD' ? 'production' : 'sandbox'
  };
}

export async function requireCashfreeConfig(): Promise<CashfreeConfig> {
  const c = await getCashfreeConfig();
  if (!c.enabled) throw new CashfreeConfigError('Cashfree is disabled');
  if (!c.appId || !c.secretKey) throw new CashfreeConfigError('Cashfree credentials are not configured');
  return c;
}

// ---- money ------------------------------------------------------------------

/** Internal integer paise -> Cashfree decimal rupees (2dp). */
export const paiseToRupees = (paise: number) => Math.round(paise) / 100;
/** Cashfree decimal rupees -> integer paise (tolerates 1499, 1499.0, "1499.00"). */
export const rupeesToPaise = (rupees: number | string) => Math.round(Number(rupees) * 100);

// ---- HTTP -------------------------------------------------------------------

/** Deterministic UUID-shaped idempotency key derived from a stable string. */
export function idempotencyKey(seed: string): string {
  const h = crypto.createHash('sha256').update(`adc-cashfree:${seed}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

let fetchImpl: typeof fetch = (...a) => fetch(...a);
/** Test hook. */
export function setCashfreeFetchForTests(f: typeof fetch | null) {
  fetchImpl = f ?? ((...a) => fetch(...a));
}

async function call<T>(
  c: CashfreeConfig,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  opts: { idempotencyKey?: string; timeoutMs?: number } = {}
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 15_000);
  let res: Response;
  try {
    res = await fetchImpl(`${c.baseUrl}${path}`, {
      method,
      signal: ctrl.signal,
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'x-client-id': c.appId,
        'x-client-secret': c.secretKey,
        'x-api-version': c.apiVersion,
        'x-request-id': crypto.randomUUID(),
        ...(opts.idempotencyKey ? { 'x-idempotency-key': opts.idempotencyKey } : {})
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store'
    });
  } catch (e: any) {
    throw new CashfreeApiError(`Cashfree unreachable: ${e?.name === 'AbortError' ? 'timeout' : 'network error'}`, 0);
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) {
    // Only Cashfree's own message/code — never echo request headers.
    throw new CashfreeApiError(
      `Cashfree ${method} ${path.split('?')[0]} failed (${res.status}): ${String(json?.message ?? 'error').slice(0, 200)}`,
      res.status,
      json?.code,
      json?.type
    );
  }
  return json as T;
}

// ---- entities ---------------------------------------------------------------

export type CfOrder = {
  cf_order_id: string | number;
  order_id: string;
  order_amount: number;
  order_currency: string;
  order_status: 'ACTIVE' | 'PAID' | 'EXPIRED' | 'TERMINATED' | 'TERMINATION_REQUESTED' | string;
  payment_session_id?: string;
  order_expiry_time?: string;
};

export type CfPaymentStatus = 'SUCCESS' | 'NOT_ATTEMPTED' | 'FAILED' | 'USER_DROPPED' | 'VOID' | 'CANCELLED' | 'PENDING';

export type CfPayment = {
  cf_payment_id: string | number;
  order_id: string;
  payment_status: CfPaymentStatus | string;
  payment_amount: number;
  payment_currency: string;
  payment_time?: string;
  payment_completion_time?: string;
  payment_group?: string;
  is_captured?: boolean;
  error_details?: { error_code?: string; error_description?: string; error_reason?: string } | null;
};

export type CfRefund = {
  cf_refund_id: string | number;
  refund_id: string;
  order_id?: string;
  refund_amount: number;
  refund_currency: string;
  refund_status: 'SUCCESS' | 'PENDING' | 'PENDING_APPROVAL' | 'CANCELLED' | 'ONHOLD' | 'REJECTED' | string;
};

export type CreateOrderInput = {
  orderId: string;
  amountPaise: number;
  currency: 'INR';
  customer: { id: string; phone: string; email?: string | null; name?: string | null };
  returnUrl: string;
  notifyUrl?: string | null;
  expiresAt: Date;
  tags?: Record<string, string>;
};

export async function createCashfreeOrder(c: CashfreeConfig, i: CreateOrderInput): Promise<CfOrder> {
  const name = (i.customer.name ?? '').trim();
  return call<CfOrder>(
    c,
    'POST',
    '/orders',
    {
      order_id: i.orderId,
      order_amount: paiseToRupees(i.amountPaise),
      order_currency: i.currency,
      customer_details: {
        customer_id: i.customer.id.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 50),
        customer_phone: i.customer.phone,
        ...(i.customer.email ? { customer_email: i.customer.email.slice(0, 100) } : {}),
        ...(name.length >= 3 ? { customer_name: name.slice(0, 100) } : {})
      },
      order_meta: {
        return_url: i.returnUrl,
        ...(i.notifyUrl ? { notify_url: i.notifyUrl } : {})
      },
      order_expiry_time: i.expiresAt.toISOString(),
      ...(i.tags ? { order_tags: i.tags } : {})
    },
    { idempotencyKey: idempotencyKey(`create:${i.orderId}`) }
  );
}

export const getCashfreeOrder = (c: CashfreeConfig, orderId: string) =>
  call<CfOrder>(c, 'GET', `/orders/${encodeURIComponent(orderId)}`);

export const getCashfreePayments = (c: CashfreeConfig, orderId: string) =>
  call<CfPayment[]>(c, 'GET', `/orders/${encodeURIComponent(orderId)}/payments`);

export const getCashfreeRefunds = (c: CashfreeConfig, orderId: string) =>
  call<CfRefund[]>(c, 'GET', `/orders/${encodeURIComponent(orderId)}/refunds`);

export async function createCashfreeRefund(
  c: CashfreeConfig,
  orderId: string,
  refundId: string,
  amountPaise: number,
  note?: string
): Promise<CfRefund> {
  return call<CfRefund>(
    c,
    'POST',
    `/orders/${encodeURIComponent(orderId)}/refunds`,
    {
      refund_amount: paiseToRupees(amountPaise),
      refund_id: refundId,
      ...(note && note.trim().length >= 3 ? { refund_note: note.trim().slice(0, 100) } : {})
    },
    { idempotencyKey: idempotencyKey(`refund:${refundId}`) }
  );
}

// ---- webhook signature ------------------------------------------------------

/** Max accepted |now - x-webhook-timestamp|. Replays are additionally harmless
 * because every webhook is re-verified against Cashfree's API before acting. */
export const WEBHOOK_MAX_SKEW_MS = 24 * 60 * 60 * 1000;

export type SignatureCheck = { ok: true } | { ok: false; reason: 'missing-headers' | 'bad-signature' | 'stale-timestamp' };

/**
 * Official procedure: base64(HMAC-SHA256(timestamp + rawBody, client secret)),
 * compared in constant time against x-webhook-signature. `rawBody` must be the
 * exact bytes received (JSON re-serialisation changes e.g. 170.00 -> 170).
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  secretKey: string,
  now = Date.now()
): SignatureCheck {
  if (!signature || !timestamp || !secretKey) return { ok: false, reason: 'missing-headers' };
  const expected = crypto.createHmac('sha256', secretKey).update(timestamp + rawBody).digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature.trim());
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, reason: 'bad-signature' };
  // Timestamp is milliseconds in Cashfree samples; accept seconds too.
  const n = Number(timestamp);
  const ms = n > 1e12 ? n : n * 1000;
  if (!Number.isFinite(ms) || Math.abs(now - ms) > WEBHOOK_MAX_SKEW_MS) return { ok: false, reason: 'stale-timestamp' };
  return { ok: true };
}

/** Indian mobile number as Cashfree expects (10 digits). */
export function normalizeIndianPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let d = input.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

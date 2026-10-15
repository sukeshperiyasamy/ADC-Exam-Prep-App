---
name: payment-security-audit
description: "Mandatory security and fraud-prevention checklist for payment, checkout, and webhook modifications."
---

# Payment & Financial Security Audit Checklist

## Purpose
Ensure zero financial loss, zero unauthorized exam access, and zero data corruption in payment-related workflows.

## Mandatory Security Rules
1. **Integer Paise Storage:** All INR prices and calculations must be represented as integer paise in code and database columns (`order.amount`, `bundle.price`, `invoice.total`). Convert to rupees (`amount / 100`) strictly at the external gateway boundary.
2. **Server-Authoritative Pricing:** The browser must never submit the price. Client sends only `bundleId`. Server resolves the price strictly from the database.
3. **Decoupled Entitlements:** Visiting `/checkout/success` or manipulating client state grants zero access. Attempt endpoints (`/api/attempts/start`) strictly verify an active row in `Entitlement`.
4. **Cryptographic Webhook Verification:**
   - Always read raw request body (`await req.text()`) before JSON parsing.
   - Verify signatures via HMAC-SHA256 and `crypto.timingSafeEqual`.
   - Validate timestamp drift (< 300s) to prevent replay attacks.
5. **Database-Backed Idempotency:** Webhook events must be logged to `PaymentWebhookEvent` with composite unique constraint `[provider, eventId]`. Duplicate events must return HTTP 200 `{ ok: true, dedup: true }` without re-running fulfillment.
6. **Atomic Fulfillment:** Multi-table mutations (`order.status = 'PAID'`, `entitlement.upsert`, `invoice.create`) must execute inside `db.$transaction`. Side-effects (PDF generation, SMTP emails) must execute *after* commit.
7. **Sandbox-Only Testing:** Never use live payment credentials or execute real monetary charges during testing.

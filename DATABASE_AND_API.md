# DATABASE_AND_API.md — ADC Exam Prep

Verified against `prisma/schema.prisma` and `src/app/api/**` on 2026-10-27. 60 models + 10 enums; 180 route handlers under `src/app/api`. This document covers the models, relationships, access-control rules, and the important API routes. It does not list every route — use `find src/app/api -name route.ts` for the full set.

## 1. Data model (grouped)

### Identity & auth
- **User** — `role` (`Role`: `ADMIN | USER`), `active`, `emailVerified`, Argon2 `passwordHash`, `passwordSetupRequired`, `impersonatedBy`. Related: `Account` (OAuth), `OtpCode` (email OTP), `ConsentLog`.
- **ApiToken**, **WebhookSubscription**, **ReportSubscription** — admin automation surfaces.

### Catalog & content
- **Vendor** → **Exam** (`code` e.g. `ADC-PART1`, `slug`, `passingScore`, `durationMinutes`, `isTeaser`, hidden booklet `accessExam`s) → **Question** (`QType`: `SINGLE | MULTI | ORDERING | TRUE_FALSE`; `QStatus`: `DRAFT | PUBLISHED`; `domain`, `options` JSON, `correct` id array, `explanation`, `references`, optional `bookletChapterId`).
- **Bundle** → **BundleItem** (exam membership; published bundles drive checkout and bundle-sibling entitlements).
- **ExamSource** / **ExamVersion** — authoring/versioning metadata.
- **Page**, **Banner**, **Faq**, **Review**, **Testimonial** — CMS and social proof.

### Commerce
- **Order** — `OrderStatus` (`PENDING | PAID | FAILED | REFUNDED`), `amount` (integer paise), `currency` (**INR for all new orders**; legacy rows may be `SGD`), `provider` (`PaymentProvider`: `STRIPE | PAYPAL | HITPAY | PAYNOW | CASHFREE`), `number`, `bundleId`/`examId`, `tier`.
- **Invoice** — `InvoiceStatus` (`ISSUED | CREDIT_NOTE | VOID`), GST fields (`taxRate`, `taxLabel`, `taxAmount`, inclusive-of-tax split), `currency`, **legacy columns `totalSgd`/`fxRateBpsToSgd`** (no longer written for new invoices; preserved for pre-INR-migration rows), sequential `number` via **NumberCounter**.
- **Coupon** (+ `CouponRedemption`), **Refund** (+ `RefundStatus`), **PaymentStateChange**, **PaymentWebhookEvent** (idempotent by `[provider, eventId]`), **BillingAddress**, **VoucherDelivery**, **VoucherInventory**.

### Access
- **Entitlement** — unique `[userId, examId, tier]`; `Tier`: `PRACTICE | BUNDLE | VOUCHER | ADMIN_GRANT`; `expiresAt` nullable. **The single source of truth for paid access.**

### Study booklets
- **Booklet** — `BookletStatus` (`DRAFT | PUBLISHED | ARCHIVED`), `licenseConfirmed` + `licenseNote` (publication safeguard only — see §3), `accessExamId` (hidden `Exam` created with each booklet for entitlement mapping), `sourcePath`, `totalPages`.
- **BookletChapter** — position, `pdfPageFrom/To`, `isFreePreview`, `processStatus` (`ChapterProcessStatus`), `reviewStatus` (`ChapterReviewStatus`: `DRAFT | IN_REVIEW | APPROVED`), `reviewerName`, `publishedAt`, `verification` JSON (fact-check issues).
- **BookletItem** (`BookletItemKind`: `NOTE | SUMMARY | KEY_CONCEPT | TABLE | FLOWCHART | FLASHCARD`; `BookletItemStatus`: `DRAFT | APPROVED | REJECTED`), **BookletPage** (printed↔physical mapping), **BookletFigure** (private; `approved` flag), **BookletProgress** (per-user per-chapter `completedModes[]`, `completedAt`), **BookletBookmark**.

### Ops
- **EmailLog**, **EmailTemplate** (`EmailTemplateKey`), **AdminLog** (audit trail written by `makeLogger`), **Setting** (AES-256-GCM encrypted key/value — keys enumerated in `lib/settings.ts`), **UserNote/Tag/UserTag**.

## 2. Important relations

- `User → Entitlement → Exam` (paid access) — booklet entitlements point at the booklet's hidden `accessExam`; `hasBookletEntitlement()` (`lib/booklet/queries.ts`) accepts **ADC-PART1 code**, the booklet's own access exam, or any exam in a **published bundle** containing it.
- `Order 1—1 Invoice` (credit notes reference `creditNoteOfId`), `Order → Entitlement` via `fulfillOrder()`.
- `Booklet → BookletChapter → BookletItem/BookletPage/BookletFigure/Question(bookletChapterId)/BookletProgress/BookletBookmark`.
- `Attempt → Exam`, `Attempt.userId` nullable (guest teaser attempts carry a `guestToken` cookie check instead).

## 3. Access-control rules (server-authoritative)

1. **Pure rules engine:** `lib/booklet/access.ts` —
   - `isChapterLive(b, c)` = booklet `PUBLISHED` **and** chapter `reviewStatus === 'APPROVED'` **and** `publishedAt !== null`. The `licenseConfirmed` flag is deliberately **not** part of visibility: it is a publication safeguard enforced by `chapterPublishBlockers()` and by `admin-actions.updateBooklet` (revoking licensing reverts the booklet to `DRAFT`).
   - `decideAccess(b, c, viewer)` → `admin` | `entitled` | `free-preview` | `unpublished` | `login-required` | `purchase-required`.
2. **Entitlement check:** `hasBookletEntitlement(userId, accessExamId)` — active (non-expired) rows in tiers `PRACTICE | BUNDLE | VOUCHER | ADMIN_GRANT` matching ADC-PART1, the access exam, or published-bundle siblings. Mirrors `/api/attempts/start` gating.
3. **Every student booklet API** (attempts, figures proxy, page inspector, progress, bookmarks) resolves via `resolveViewer()` + `decideAccess()` — no route duplicates or bypasses this logic.
4. **Admin:** `role === 'ADMIN'` bypasses publication checks for preview only; all admin mutation routes require the admin session (403 otherwise) and write `AdminLog`.
5. **Unpublished content 404s** rather than leaking existence; figures/PDF pages are private objects served through entitlement-checked proxies only.

## 4. API route map (high level; 180 handlers total)

| Area | Routes | Notes |
|---|---|---|
| Auth/OTP | `/api/auth/*` (NextAuth), `/api/otp/request`, `/api/otp/verify` | OTP purposes: `LOGIN`, `REGISTER`, `RESET`, `TEASER_GATE` |
| Attempts | `/api/attempts/start`, `/api/attempts/autosave`, `/api/attempts/submit` | Entitlement-gated; server-side scoring; submit rejects partial question sets (422) |
| Checkout | `/api/checkout/methods`, `/api/stripe/create-order`, `/api/stripe/webhook`, `/api/orders/[id]/status` | Methods API returns Stripe `enabled` (INR) and PayNow/HitPay/PayPal `disabled` |
| Disabled rails | `/api/paynow/create-order` (400 INR-only guard), `/api/paynow/confirm` (admin legacy reconciliation), `/api/hitpay/*`, `/api/paypal/*` | Kept as guards/legacy surfaces; not offered in checkout |
| Booklets (student) | `/api/booklets/[slug]/attempts`, `/api/booklets/[slug]/chapters/[cslug]/pages/[page]`, `/api/booklets/chapters/[cid]/progress`, `/api/booklets/chapters/[cid]/bookmarks`, `/api/booklets/figures/[id]` | All `decideAccess`-gated; figures/pages private |
| Booklets (admin) | `/api/admin/booklets/**` (CRUD, chapters, items, questions, figures, source), `/api/admin/upload` | Admin-session required; license confirmation requires a recorded note |
| Commerce admin | `/api/admin/orders`, `/api/admin/invoices`, `/api/admin/coupons`, `/api/admin/vouchers`, `/api/admin/reports` | |
| Email | `/api/admin/email-templates/*`, `/api/worker/reports` (shared-secret digest worker) | |
| Reviews | `/api/reviews` (eligibility: purchase or attempt) | |

## 5. Currency handling (post INR enforcement, 2026-10-27)

- All new money is INR integer paise; formatting centralized in `formatPrice()` (`lib/utils.ts`, `Intl.NumberFormat('en-IN')`); email/pdf formatters mirror it.
- `issueInvoiceForOrder()` (`lib/invoice/issue.ts`) **no longer writes** `totalSgd`/`fxRateBpsToSgd`; the columns remain nullable for historical rows. Credit notes still mirror a legacy original's stored FX values for accounting consistency.
- `analytics.taxCollectedIn()` aggregates per-currency honestly (`byCurrency`); the SGD-total aggregation and all SGD-equivalent UI (invoices, tax report, PDF footnote, worker email) were removed.
- `formatPrice` retains an explicit `SGD $` branch **for legacy rows only** (Intl renders SGD as a bare `$` in many locales); documented in-code as legacy-only.
- Regression guard: `scripts/test-inr-migration.ts` Test Suite 8 fails on any new SGD/S$ display string in `src/` outside the documented allowlist.

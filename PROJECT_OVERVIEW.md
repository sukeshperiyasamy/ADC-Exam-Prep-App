# PROJECT_OVERVIEW.md — ADC Exam Prep

**Scope:** architecture, technology stack, modules, integrations, and data flow as they exist in the repository today (verified 2026-10-27; sources: source inspection this session, `git log`, `prisma/schema.prisma`, `package.json`). Companion documents: [`DATABASE_AND_API.md`](DATABASE_AND_API.md) (models/APIs), [`FEATURE_STATUS.md`](FEATURE_STATUS.md) (evidence per feature), [`TESTING_AND_DEPLOYMENT.md`](TESTING_AND_DEPLOYMENT.md) (how it is verified and shipped).

## 1. Technology stack

| Area | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript | `npm run build` = `prisma generate && next build --webpack` (build uses webpack; dev uses Turbopack by default) |
| Styling | Tailwind CSS 3.4 | `brand` teal palette (`#0f766e` scale, full 50–950 ramp in `tailwind.config.ts`); shared component classes in `src/app/globals.css` (`.btn-*`, `.card`, `.input`, `.badge`, `.container-app`); dark mode = `class` strategy with an inline no-flash init script in `layout.tsx` |
| Database | PostgreSQL | Production: Neon serverless. Local dev: **embedded Postgres** via `npm run db:local` on `127.0.0.1:55434` (data in gitignored `.localdb/`). Legacy alternative: `docker-compose.yml` (postgres on 55432 + MailHog) still present |
| ORM | Prisma | ~60 models / 10 enums in `prisma/schema.prisma` (see `DATABASE_AND_API.md`) |
| Auth | Auth.js / NextAuth | Credentials (Argon2 password hashes), email OTP (`OtpCode` + `/api/otp/*`), OAuth via DB-configured provider settings; JWT sessions; `impersonatedBy` support for admin "view as" |
| Payments | **Stripe (INR only)** | Checkout Sessions + webhook with signature verification; PayNow/HitPay/PayPal **disabled server-side**; Cashfree scaffolding present but inactive (backlog) |
| Currency | INR (₹), integer paise | Enforced app-wide; see `AGENTS.md` §1.1 and `src/lib/utils.ts#formatPrice` |
| Email | Nodemailer | Transports: `SMTP` / `GMAIL_OAUTH` / `GMAIL_SERVICE_ACCOUNT`, chosen via encrypted `Setting` values; Handlebars templates in `src/lib/email/` |
| AI | `@google/genai` (Gemini) | Booklet PDF→content conversion pipeline only; fail-fast 503 when unconfigured; `@anthropic-ai/claude-agent-sdk` present as a dependency (agent tooling, not product runtime) |
| Files | Cloudflare R2 (`@aws-sdk/client-s3`) or local disk | Private booklet figures/pages; served only through entitlement-checked API proxies |
| PDF | pdf-lib (invoice render), pdf-parse + pdfjs-dist (booklet source extraction) | |
| Monitoring | Sentry (`@sentry/nextjs`) | |
| Testing | Plain `tsx` assertion scripts (no Jest) | 5 suites; see `TESTING_AND_DEPLOYMENT.md` |

## 2. Module map (source layout)

```
src/
├── app/
│   ├── page.tsx                     # marketing homepage (hero, features, pricing, FAQ)
│   ├── practice-exams/              # catalog hub, vendor pages, exam detail + checkout entry
│   ├── bundles/[slug]/              # public bundle landing pages
│   ├── checkout/                    # bundle checkout, processing, success, failed
│   ├── exam/[attemptId]/            # exam runner (timed + practice modes)
│   ├── results/[attemptId]/         # results, per-domain analytics, share page
│   ├── user-dashboard/              # candidate area: overview, exams, attempts, orders,
│   │                                #   invoices, vouchers, settings, study (library/booklet/chapter)
│   ├── admin-dashboard/             # 27+ admin pages: orders, users, bundles, exams, questions,
│   │                                #   booklets, vouchers, coupons, invoices, reports (revenue/tax/exams),
│   │                                #   settings (12+ groups), emails, pages CMS, banners, FAQ, reviews…
│   ├── p/[slug]/                    # CMS pages (terms, refund policy, support, about)
│   └── api/                         # 180 route handlers (see DATABASE_AND_API.md)
├── components/
│   ├── nav.tsx / footer.tsx / brand-logo.tsx / whatsapp-widget.tsx
│   ├── exam-runner.tsx              # the exam engine client (timer, palette, flagging, autosave)
│   ├── user-chrome.tsx / admin-chrome.tsx
│   ├── booklet/                     # library-browser, toc (+ chapter rail), client (flashcards,
│   │                                #   attempts, bookmarks), source-inspector, admin-client
│   └── checkout/                    # payment-methods, billing-address-card, promo-code, paynow-modal*
└── lib/
    ├── auth.ts, db.ts, settings.ts  # NextAuth config, Prisma singleton, AES-256-GCM settings store
    ├── attempts.ts                  # scoring (SINGLE/MULTI/ORDERING/TRUE_FALSE), answer validation
    ├── fulfill.ts                   # atomic order fulfillment (order→PAID, entitlement, invoice, email)
    ├── analytics.ts                 # revenue/tax aggregations (per-currency honest breakdown)
    ├── invoice/                     # issue.ts (GST split, sequential numbering), render-invoice-pdf.ts
    ├── payments/                    # stripe, webhook-log (idempotent), refund, order-entitlements,
    │                                #   cashfree* (inactive scaffolding)
    ├── booklet/                     # access.ts, queries.ts, admin-actions.ts, pipeline.ts (Gemini),
    │                                #   store.ts, schemas.ts, toc.ts (reconstructed hierarchy), gemini.ts
    └── storage.ts                   # R2 / local private object storage
```

\* `paynow-modal.tsx` was removed in the INR enforcement pass; the disabled PayNow/HitPay method entries remain only as server-side guard rails.

## 3. Core data flows

### 3.1 Purchase → access
1. Candidate picks a bundle/exam on `/checkout/bundle/[bundleId]` (price always server-authoritative from the DB — ₹1,499 = `149900` paise).
2. `POST /api/stripe/create-order` mints an `Order` (`PENDING`, currency `INR`) and a Stripe Checkout Session.
3. Stripe webhook (`/api/stripe/webhook`) verifies the signature (HMAC, raw body, timing-safe) and logs to `PaymentWebhookEvent` (idempotent by `[provider, eventId]`).
4. `fulfillOrder()` runs in a transaction: order → `PAID`, `Entitlement` upsert, `Invoice` issue (GST split, sequential `INV-YYYY-NNNNN` via `NumberCounter`), then post-commit side effects (PDF receipt, confirmation email). Email/SMTP failures never roll back payment.
5. Exam/booklet access is gated **only** by `Entitlement` rows (tiers `PRACTICE | BUNDLE | VOUCHER | ADMIN_GRANT`, `expiresAt`-aware) — never by client state, checkout success pages, or redirects.

### 3.2 Exam attempt
`/api/attempts/start` (entitlement-gated; free 10-question teaser uses an OTP guest gate) → `Attempt` row (`PENDING`, `questionIds`, `durationSec`, `expiresAt`) → `ExamRunner` (client) with autosave to `/api/attempts/autosave` → submit recomputes the score **server-side** in `lib/attempts.ts` (`scoreAttempt`; answers are never trusted from the client and are hidden in practice mode until submission) → `/results/[attemptId]` renders per-domain analytics + answer review.

### 3.3 Booklet study content
1. **Admin:** upload source PDF → `pdf-parse`/`pdfjs` text extraction → Gemini conversion (`lib/booklet/pipeline.ts`) or direct JSON import → items stored as `BookletItem` rows (`NOTE | SUMMARY | KEY_CONCEPT | TABLE | FLOWCHART | FLASHCARD`) + `Question` MCQs + `BookletPage` (printed↔physical page mapping) + `BookletFigure` (private images).
2. **Clinical review workflow:** items approved individually (`bulkSetStatus`), chapter review submit → approve with a **named reviewer**, fact-check issues must be resolved; `chapterPublishBlockers()` (in `lib/booklet/access.ts`) refuses publication unless: licence confirmed (with a recorded note), processed, clinically approved, reviewer named, zero DRAFT items, ≥1 approved item, zero high-severity unresolved issues. Booklet-level publish additionally requires at least one live chapter; revoking licensing via the admin API **reverts the booklet to DRAFT**.
3. **Student:** `decideAccess()` (same file) evaluates publication + review + auth + entitlement + free-preview for every surface — library, booklet page, chapter reader, attempts, figures proxy, page inspector, progress, bookmarks. The license flag is a **publication safeguard only**, never an independent visibility gate.

### 3.4 Booklet TOC hierarchy
`lib/booklet/toc.ts` holds reconstructed section groupings per booklet slug (e.g. `tg-oral-dental`: **42 chapters in 9 clinically coherent sections**, with an "Additional Chapters" fallback group guaranteeing nothing is dropped). The UI labels these as curated reconstructions, not the publisher's original TOC.

## 4. Integrations

| Integration | Status | Where |
|---|---|---|
| Stripe (INR) | Active | `src/app/api/stripe/*`, keys in encrypted `Setting`/env |
| PayNow / HitPay / PayPal | **Disabled** (SGD/legacy rails; INR-only policy) | Disabled in `/api/checkout/methods`; `/api/paynow/create-order` returns a 400 INR-only rejection; `/api/paynow/confirm` retained for legacy reconciliation; UI entries removed |
| Cashfree | Scaffolding only — **inactive**, backlog | `src/lib/payments/cashfree*.ts`, `docs/future-plans/` |
| Gemini | Active for booklet conversion | `lib/booklet/gemini.ts` (reads `GEMINI_API_KEY` or Vertex `GOOGLE_CLOUD_PROJECT`/`GOOGLE_APPLICATION_CREDENTIALS` from settings/env) |
| Cloudflare R2 | Active when configured | `lib/storage.ts`, `BOOKLET_FIGURE_STORAGE` setting (`local` default) |
| Email (SMTP/Gmail OAuth/service account) | Active | `lib/mail.ts`, `lib/email/*` |
| Sentry, Plausible (optional) | Config-gated | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` env; Sentry config in `next.config.mjs` |
| Claude Agent SDK | Dev tooling only | Not part of product runtime |

## 5. Key invariants (do not break)

1. **INR-only (₹)** — prices, invoices, reports, checkout (see `AGENTS.md` §1.1). Legacy SGD rows keep explicit legacy labels; never relabel or silently convert.
2. **Server-authoritative money & access** — clients never set prices, entitlements, or answers.
3. **Clinical-review & licensing safeguards** — unreviewed/unlicensed content cannot be published through the workflow, and the workflow is the only supported publication path.
4. **Idempotent webhooks + atomic fulfillment** — webhook events deduplicated; fulfillment in a transaction; email failures isolated.
5. **Encrypted settings** — secrets live AES-256-GCM in the `Setting` table or env; never logged, never committed.

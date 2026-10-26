# FEATURE_STATUS.md — ADC Exam Prep

Statuses: **IMPLEMENTED** (working + verified) · **PARTIAL** (works with noted limits) · **MISSING** · **BROKEN** · **UNVERIFIED** (exists but no run evidence in this workspace). Evidence codes: `[T]` automated test run, `[B]` real-browser check, `[S]` static/source inspection, `[P]` production usage. Dated runs are from 2026-10-26/27 in this workspace unless noted. Machine-readable backlog: `features.json`; session log: `progress.md`.

## Public / marketing

| Feature | Status | Files | Evidence |
|---|---|---|---|
| Homepage (hero, features, pricing ₹1,499, FAQ, disclosures) | IMPLEMENTED | `src/app/page.tsx` | [B] screenshot + [T] `check:links` (progress.md §20) |
| Practice-exams catalog (dual-card, 7 discipline filters, verified counts) | IMPLEMENTED | `src/app/practice-exams/page.tsx`, `filters.tsx` | [B] 1440×900 + 390×844 (progress.md §16), [T] link check |
| Bundle landing pages | IMPLEMENTED | `src/app/bundles/[slug]/page.tsx` | [S]; linked from catalog |
| CMS pages (terms, refund policy, support, about) | IMPLEMENTED | `src/app/p/[slug]/page.tsx`, `lib/pages.ts` | [T] `check:links` 56/56 (progress.md §22) |
| Vendors index | IMPLEMENTED | `src/app/vendors/page.tsx` | [S] |
| SEO (sitemap, robots, OG images, JSON-LD) | IMPLEMENTED | `src/app/sitemap.ts`/`robots.ts`/`layout.tsx` | [S]; routes present in build output |

## Auth & accounts

| Feature | Status | Files | Evidence |
|---|---|---|---|
| Credentials sign-in (Argon2) | IMPLEMENTED | `lib/auth.ts`, `src/app/login` | [T] booklet HTTP suite logs in users via credentials (21/21) |
| Email OTP (login/register/reset + teaser gate) | IMPLEMENTED | `src/app/api/otp/*`, `verify-otp`, `forgot-password`, `set-password` | [T] teaser gate exercised in HTTP suite |
| OAuth providers | IMPLEMENTED (config-gated) | `lib/auth.ts`, admin social-login settings, `social-login-buttons.tsx` | [S] — provider enablement is DB-config driven; not exercised in tests (UNVERIFIED at runtime) |
| Admin "View As" (admin ↔ user) | IMPLEMENTED | `components/user-menu.tsx` | [S]; not covered by automated tests (UNVERIFIED at runtime) |

## Exam engine & results

| Feature | Status | Files | Evidence |
|---|---|---|---|
| Exam runner: timed + practice modes, countdown w/ auto-submit, flagging, question palette, review-before-submit modal, autosave, unanswered jump | IMPLEMENTED | `components/exam-runner.tsx` | [T] HTTP suite: start → answer → autosave → submit → results (21/21); [B] earlier sessions |
| Server-side scoring (SINGLE/MULTI/ORDERING/TRUE_FALSE, malformed-key + denominator hardening) | IMPLEMENTED | `lib/attempts.ts` | [T] `test:scoring` 25/25 (progress.md §23) + integration 38/38 |
| Free teaser (10 Qs, guest OTP gate) | IMPLEMENTED | `teaser-gate.tsx`, `src/app/practice-exams/[vendor]/[slug]/teaser` | [T] HTTP suite; [B] |
| Results: score, pass/fail, per-domain analytics, answer review with explanations, ORDERING position review | IMPLEMENTED | `src/app/results/[attemptId]/page.tsx` | [T] HTTP suite asserts explanations + results |
| Share result page + OG image | IMPLEMENTED | `results/[attemptId]/share`, `src/app/api/og/*` | [S]; not browser-verified this session (UNVERIFIED visual) |
| Reviews/testimonials (eligibility-gated) | IMPLEMENTED | `api/reviews`, `review-form-modal.tsx`, admin pages | [S]; not covered by automated tests (UNVERIFIED at runtime) |

## Study booklets

| Feature | Status | Files | Evidence |
|---|---|---|---|
| Admin pipeline: upload → extract → Gemini convert / JSON import → items → review → publish | IMPLEMENTED | `lib/booklet/pipeline.ts`, `admin-actions.ts`, `admin-dashboard/booklets/*` | [T] integration 38/38 (mocked Gemini) + HTTP 21/21 (503 fail-fast when unconfigured) |
| Student library (search, access filters, cards, CTAs, progress-on-real-data) | IMPLEMENTED | `components/booklet/library-browser.tsx`, `user-dashboard/study/page.tsx` | [T] HTTP suite library assertions (2026-10-27) |
| Booklet TOC: 9 reconstructed sections, collapsible, current/completed/locked states | IMPLEMENTED | `components/booklet/toc.tsx`, `lib/booklet/toc.ts` | [T] hierarchy-completeness test (integration) + eTG 42/42 unique verified read-only |
| Chapter reader (breadcrumbs, sticky mode tabs, reading column, chapter rail, prev/next, locked/empty states) | IMPLEMENTED | `user-dashboard/study/[booklet]/[chapter]/page.tsx` | [T] HTTP suite renders all six modes with content |
| Six study modes + booklet MCQs (Easy Notes, Short Summary, Key concepts, Tables, Flowcharts, Flashcards) | IMPLEMENTED | `chapter page` + `components/booklet/client.tsx` | [T] HTTP suite mode-by-mode content assertions |
| PDF source inspector (printed ↔ physical page mapping, private page proxy) | IMPLEMENTED | `components/booklet/source-inspector.tsx`, `api/booklets/.../pages/[page]` | [T] 403 unentitled / 200 entitled asserted |
| Private figure proxy (R2 or local) | IMPLEMENTED | `api/booklets/figures/[id]`, `lib/storage.ts`, `lib/booklet/figure-storage.ts` | [T] unapproved → 404 students, admin ok; approved → entitled ok |
| Progress + bookmarks | IMPLEMENTED | progress/bookmark routes | [T] persistence + 402 for unentitled asserted |
| Access policy: license flag = publication safeguard only; entitlement tiers incl. ADC-PART1 + bundle siblings; expiry honored | IMPLEMENTED | `lib/booklet/access.ts`, `queries.ts` | [T] unit 27/27, integration 38/38, HTTP 21/21 — incl. expired/revoked/refunded denial |
| **eTG booklet (`tg-oral-dental`) publication** | **BLOCKED (by design)** | local DB record | Verified read-only 2026-10-27: `DRAFT`, `licenseConfirmed: false` (note is not licensing evidence), all **42 chapters** `reviewStatus: DRAFT`, no reviewer, `publishedAt: null`, 1,924/1,924 items DRAFT. Requires user-authorized licensing confirmation + named clinical review + publication via the existing workflow. Not bypassed. |
| Demo fixture booklet (student-experience testing) | IMPLEMENTED (local dev only) | `scripts/dev-booklet-fixture.ts` | Created + published via the real admin-actions workflow on local DB |

## Commerce

| Feature | Status | Files | Evidence |
|---|---|---|---|
| Stripe INR checkout + webhook (signature-verified, idempotent events) | IMPLEMENTED | `api/stripe/*`, `lib/fulfill.ts`, `lib/payments/webhook-log.ts` | [T] methods denomination + unsigned-webhook rejection asserted (test:inr); [P] production INR charges (progress.md §19) |
| Atomic fulfillment (order→PAID + entitlement + GST invoice + email) | IMPLEMENTED | `lib/fulfill.ts`, `lib/invoice/issue.ts` | [S]; [P] production usage |
| GST invoices (sequential numbering, inclusive tax, PDF) | IMPLEMENTED | `lib/invoice/*` | [T] INR suite; [S] PDF renderer reviewed |
| Refunds + credit notes | IMPLEMENTED | `lib/payments/refund.ts`, `issueCreditNoteForInvoice` | [S]; entitlement revocation covered by integration test |
| Coupons/promo codes | IMPLEMENTED | `api/coupons/validate`, `promo-code.tsx`, admin pages | [S]; not covered by automated tests (UNVERIFIED at runtime) |
| Vouchers (inventory, delivery, PDF) | IMPLEMENTED | `admin-dashboard/vouchers*`, `api/vouchers/*`, `VoucherDelivery` | [S]; [T] delivery scheduling untested here (UNVERIFIED at runtime) |
| Billing addresses | IMPLEMENTED | `billing-address-card.tsx`, `api/billing-addresses` | [S] |
| **PayNow / HitPay / PayPal rails** | **DISABLED (policy: INR-only)** | `api/checkout/methods`, `api/paynow/create-order` (400 guard), `api/paynow/confirm` (legacy reconciliation) | [T] order creation on all three rejected with 400 |
| **Cashfree** | PARTIAL — scaffolding only, **inactive** | `lib/payments/cashfree*.ts`, `prisma/migrations/*_add_cashfree`, `docs/future-plans/` | [S]; backlog FEAT-006; do not activate without authorization |
| INR-only currency enforcement + legacy SGD handling | IMPLEMENTED | `AGENTS.md` §1.1, `lib/utils.ts#formatPrice`, `lib/invoice/issue.ts` | [T] test:inr 19/19 incl. source-scan regression guard (2026-10-27) |

## Dashboards & admin

| Feature | Status | Files | Evidence |
|---|---|---|---|
| Candidate dashboard (overview stats, exams, attempts, orders, invoices, vouchers, settings) | IMPLEMENTED | `user-dashboard/*` | [T] HTTP suite; [B] |
| Admin dashboard (27+ pages: orders, users, exams, questions, bundles, coupons, vouchers, invoices, reports, settings, CMS, reviews, emails, webhooks, audit) | IMPLEMENTED | `admin-dashboard/*`, `components/admin/*` | [S]; booklets admin covered by HTTP suite; several pages hand-roll tables (tech debt — see KNOWN_ISSUES) |
| Reports (revenue, tax, exams) | IMPLEMENTED | `admin-dashboard/reports/*`, `lib/analytics.ts` | [T] INR suite compiles + asserts methods/analytics inputs; report pages themselves [S] (not browser-verified post-redesign) |
| Email templates admin + worker digest | IMPLEMENTED | `admin-dashboard/settings/email-templates*`, `api/worker/reports` | [S] |
| Encrypted settings store (AES-256-GCM) | IMPLEMENTED | `lib/settings.ts`, `Setting` table | [S]; keys enumerated in code |
| Audit log (AdminLog) | IMPLEMENTED | `makeLogger`, `admin-dashboard/audit` | [S] |

## Security & abuse protection

| Feature | Status | Files | Evidence |
|---|---|---|---|
| OTP request caps (per-IP in-memory + per-email DB-backed hourly count), single-live-code invariant, hashed codes | IMPLEMENTED | `lib/otp.ts`, `api/otp/request` | [T] `scripts/test-otp-rate-limit.ts` 3/3 (2026-10-27) |
| OTP verify brute-force cap (10/hour/email, covers NextAuth otp provider path) | IMPLEMENTED | `lib/otp.ts#verifyOtp` | [T] same script — correct code rejected after 10 wrong attempts |

## Cross-cutting

| Feature | Status | Evidence |
|---|---|---|
| Dark mode (class strategy, no-flash init) | IMPLEMENTED | [B] earlier sessions; `layout.tsx` |
| Keyboard focus-visible ring app-wide | IMPLEMENTED | `globals.css` base rule [S] |
| Responsive layouts (desktop 1440 / mobile 390) | IMPLEMENTED | [B] catalog + study pages (progress.md §16, §27); not re-verified after the INR pass (docs-only change) |
| Rate limiting / brute-force protection on OTP | PARTIAL | [S] OTP expiries exist; no rate-limit middleware found |
| Playwright e2e | MISSING (dependency installed, no specs) | `devDependencies.playwright`; no `e2e/` directory |
| CI pipeline | MISSING | No `.github/workflows` found |

## Legend notes

- **UNVERIFIED at runtime** means the feature's code exists and follows app conventions but no automated test or browser session exercised it in this workspace — do not claim it works until verified.
- Legacy admin test claims from before 2026-10-26 are recorded in `progress.md` with their original dates.

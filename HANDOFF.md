# HANDOFF.md — START HERE for the next AI agent

**Read this file and [`AGENTS.md`](AGENTS.md) before making any changes.** Then skim [`FEATURE_STATUS.md`](FEATURE_STATUS.md) (what works, with evidence) and [`TESTING_AND_DEPLOYMENT.md`](TESTING_AND_DEPLOYMENT.md) (how to verify). Full detail lives in [`progress.md`](progress.md).

## 0. Non-negotiable constraints

1. **INR-only (₹), India-only product.** No new currencies, no SGD revival, no unlabeled `$`. `AGENTS.md` §1.1 + the `test:inr` source-scan guard enforce this.
2. **Never bypass** auth, entitlement checks (`decideAccess` / `hasBookletEntitlement`), licensing confirmation, or clinical-review gates — including for testing. Use `scripts/dev-booklet-fixture.ts` (local synthetic fixture) instead.
3. **No production data changes, no migrations, no deploys, no payment-provider changes** without explicit user approval.
4. One feature at a time; verify with real commands; update `features.json` + `progress.md` before handoff; never claim a test passed unless you ran it.
5. Secrets live in `.env` and the encrypted `Setting` table — never print, commit, or document their values.

## 1. Current state (2026-10-27)

- **Branch `main`, last commit `d1d8310`** (booklet study system + paid-access policy + study redesign + UI consistency — pushed). **The working tree is NOT clean:** the INR-enforcement session (issue.ts FX removal, SGD display removal, dead PayNow path deletion, agent rules) and this documentation pack are **uncommitted**. Commit them first (after a fresh typecheck/lint/build — see `KNOWN_ISSUES_AND_TODO.md` P0).
- **Typecheck clean; `test:inr` 19/19; `test:booklet` 27/27** on the current tree. Integration 38/38 and HTTP 21/21 ran earlier the same day (pre-INR-edit; booklet logic untouched since). Lint/build should be re-run once before committing.
- **Dev server** normally runs at `http://localhost:3040` (`npm run dev -- -p 3040`) against the embedded local Postgres (`npm run db:local`, port 55434, DB `adc_local`).
- **Production** is on Vercel + Neon and only has content up to `fb075b2`-era features; INR-enforcement code and the booklet system are **not yet deployed**. Deployment requires user approval and a careful `prisma migrate deploy` (see `TESTING_AND_DEPLOYMENT.md` §4 — past incident: deploy hit production).

## 2. What exists and works (verified — details in FEATURE_STATUS.md)

- **Exam engine** (timed/practice, autosave, flagging, palette, review-before-submit) with server-side scoring and per-domain results; free 10-question guest teaser with OTP gate.
- **Stripe INR checkout** → atomic fulfillment (order → PAID, entitlement, GST invoice with sequential numbering, receipt email); idempotent signature-verified webhooks; refunds/credit notes; coupons; vouchers with delivery scheduling. PayNow/HitPay/PayPal **disabled by policy** (guards tested); Cashfree scaffolding inactive.
- **Study booklets:** admin convert/review/publish pipeline (Gemini or JSON import), student library + TOC + chapter reader (six modes + MCQs + PDF source inspector with printed↔physical page mapping), private figures, progress/bookmarks, entitlement + free-preview + expiry rules, license-as-publication-safeguard policy.
- **Dashboards:** candidate dashboard + 27-page admin dashboard (orders, users, catalog, invoices, reports, settings, CMS, audit).
- **Local testing aids:** `scripts/dev-booklet-fixture.ts` creates a clearly-labeled synthetic **published** booklet so student flows are testable without touching the real eTG booklet.

## 3. Known blockers (do not "fix" by bypassing)

- **eTG booklet (`tg-oral-dental`) is invisible to students by design**: `DRAFT`, `licenseConfirmed: false` (the stored note is not licensing evidence), all 42 chapters clinically unreviewed. Only the user can authorize licensing confirmation + named clinical review + publication through the admin workflow. The 42-chapter/9-section TOC is verified complete and will surface it automatically once published.
- All other open items are in [`KNOWN_ISSUES_AND_TODO.md`](KNOWN_ISSUES_AND_TODO.md) (OTP rate limiting, CI, visual QA pass, hand-rolled admin tables, stale `docs/ADC_HANDOFF.md`, etc.).

## 4. Recommended next steps, in order

> **Production-readiness audit for `6568a24`:** see `DEPLOYMENT_CHECKLIST.md` — verified local facts, the approval-gated Neon migration + Vercel deploy runbook, rollback plan, and the auto-deploy risk (check Vercel BEFORE promoting: the admin orders/invoices pages require the Neon migration first).

1. **Verify + commit the working tree** (INR enforcement + doc pack): `npm run typecheck && npm run lint && npm run build`, then commit (suggested message: "feat(currency): enforce INR-only across the app; remove legacy SGD display and dead PayNow UI; add currency rules + regression guard") and push.
2. **Visual QA pass** (desktop 1440×900 + mobile 390×844, light/dark): study library/TOC/reader redesign and the INR-touched admin invoices/tax pages. Fix anything visually off using the design tokens in `globals.css`.
3. **CI workflow** (`.github/workflows/ci.yml`): typecheck, lint, unit suites; optionally the integration suite with a Postgres service.
4. **User decision required:** eTG licensing/review/publication. Nothing to code until the user provides a real licence record and clinical review.
5. Only then: Cashfree activation decision (FEAT-006), OTP rate limiting, and admin-table consolidation.

## 5. Where things live (quick map)

| Need | Go to |
|---|---|
| Rules & currency policy | `AGENTS.md` (§1.1) |
| Architecture / data flow | `PROJECT_OVERVIEW.md` |
| Models, API routes, access rules | `DATABASE_AND_API.md` |
| Feature evidence | `FEATURE_STATUS.md` |
| Commands, test setups, deploy | `TESTING_AND_DEPLOYMENT.md` |
| Past work detail | `IMPLEMENTATION_HISTORY.md`, `progress.md` |
| Open items | `KNOWN_ISSUES_AND_TODO.md`, `features.json` |
| Backlog spec (do not activate) | `docs/future-plans/CASHFREE_PAYMENT_GATEWAY_INTEGRATION.md` |

## 6. Safe commands to resume work

```bash
npm run db:local            # 1. start embedded Postgres (keep running)
npm run dev -- -p 3040      # 2. dev server on http://localhost:3040
npm run typecheck           # 3. verify
npm run lint                # 4. verify
npm run test:booklet        # 5. booklet unit tests
npx tsx scripts/test-inr-migration.ts   # 6. currency acceptance + SGD guard (local DATABASE_URL)
# integration/HTTP suites: see TESTING_AND_DEPLOYMENT.md §2 (throwaway DB + second server)
```

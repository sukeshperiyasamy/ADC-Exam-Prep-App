# IMPLEMENTATION_HISTORY.md — ADC Exam Prep

Condensed, evidence-backed history. The full session-by-session log (with per-file detail) is [`progress.md`](progress.md) §14–§28. Nothing in this file is claimed as verified unless the cited test/command was actually run.

## Timeline

### Pre-2026-10 (platform base — legacy "Tertiary Exams" rebrand)
- Exam engine, Prisma schema, authentication, admin dashboard, multi-provider payments, email, CMS, and a multi-vendor certification catalog inherited from the base platform. Rebranded into the neutral ADC identity; legacy certification catalog retained in code/seed but not part of the ADC demo scope.
- Production deployed on Vercel (`https://adc-exam-prep-app.vercel.app/`), Neon Postgres.

### FEAT-001 · INR migration (done, production-verified)
- All public pricing/checkout moved to INR; authoritative bundle price ₹1,499 (`149900` paise) in the DB; `formatPrice('en-IN')` introduced; `scripts/test-inr-migration.ts` created. Historical orders kept original currencies (a seeded `ORD-000001` SGD order is the documented preservation fixture).

### FEAT-002/003 · Mobile header polish; custom brand identity (done)
- Mobile nav fixes; original molar-checkmark vector logo suite (`brand-logo.tsx`, multi-resolution favicons), generated via `scripts/generate-brand-assets.ts`.

### FEAT-004 · Exam scoring hardening (done)
- `lib/attempts.ts` hardened: malformed/empty answer-key guards, MULTI set-equality, ORDERING support; submission rejects partial question sets (422). Unit suite `scripts/test-exam-scoring-unit.ts` — 25/25.

### FEAT-007/008 · Catalog redesign + route fixes (done)
- `/practice-exams` dual-card hub with verified 187-question pool and 7 clinical discipline filters; homepage vendor-slug fix; terms route canonicalization; `check:links` 56/56.

### Agent workflow infra
- `AGENTS.md` rules, `features.json` backlog, `progress.md` log, `frontend-design-director` skill (`.agents/skills/`).

### 2026-10-21/22 · Booklet study system (uncommitted at the time; committed later)
- Full booklet pipeline: admin upload/convert (Gemini or JSON import)/review/publish; student library; six study modes + booklet MCQs reusing the exam engine; private figure proxy (R2/local); entitlement gating via a hidden per-booklet `Exam`.
- **Incident:** the first `prisma migrate deploy` reached the Neon production DB because `directUrl` was not overridden; the applied migration was additive and damaged nothing. See `TESTING_AND_DEPLOYMENT.md` for the required env hygiene.
- eTG "Therapeutic Guidelines: Oral and Dental (eTG 2025)" ingested to the **local** DB: 42 chapters, 1,924 items, 420 MCQs, 111 figures — kept as `DRAFT`, licence unconfirmed.
- Booklet test suites created: unit (25→27), integration (local throwaway DB), HTTP e2e (17→21).

### 2026-10-26 · Commit `d1d8310` (pushed to `origin/main`)
- "feat(booklets): study booklet system, paid-access policy, and study experience redesign" — 146 files: booklet system + tests, access-policy fix, study UI redesign, app-wide UI consistency pass (FEAT-009), Cashfree scaffolding (inactive), two migrations (`add_study_booklets`, `add_cashfree`).

### 2026-10-26 · Session: UI consistency (FEAT-009) — committed in `d1d8310`
- Completed `brand` palette (200/400/950 — fixed silently-uncompiled `brand-950` usages), global `:focus-visible` ring, dark-mode variants, button/badge/modal normalization, auth/dashboard/admin token alignment.
- Fixed a React 19 hydration warning by replacing the `next/script` theme-init with a raw inline script in `layout.tsx`.
- Verified then: typecheck clean; lint 0 errors; unit 27/27; integration 37/37; HTTP 21/21.

### 2026-10-27 · Session: booklet access approval & study UI polish (FEAT-010) — committed in `d1d8310`
- Re-verified the paid-access policy (no license-flag visibility gates remain); added the hierarchy-completeness integration test; verified the eTG TOC covers all 42 chapters uniquely (9 groups, 0 unmatched).
- Redesigned the study library (search/filters/cards), booklet TOC, and chapter reader (breadcrumbs, sticky mode tabs, reading column, chapter rail, prev/next).
- Created the local **demo fixture** booklet via the real admin-actions workflow (clearly labeled synthetic content) so the student experience is testable without publishing eTG.
- Verified: typecheck; unit 27/27; integration 38/38; HTTP 21/21; lint 0 errors; production build.

### 2026-10-27 · Session: INR enforcement (FEAT-011) — **uncommitted at time of writing**
- **Write-side fix:** `lib/invoice/issue.ts` no longer computes/stores `totalSgd`/`fxRateBpsToSgd` for new invoices; `FX_TO_SGD_*` settings keys removed.
- **Display removal:** admin invoices list/detail, tax report, invoice PDF, worker report email, analytics SGD aggregation; dead PayNow UI path removed (modal + lib deleted, picker entry and checkout branches removed); HitPay guide copy and fulfillment timezone placeholder corrected; email sample data → INR.
- **Legacy handling:** pre-migration rows keep stored values; `formatPrice`/email/PDF formatters render legacy currencies with explicit labels (documented in-code as legacy-only); `/api/paynow/confirm` retained for legacy reconciliation; `/api/paynow/create-order` kept as the INR-only rejection guard.
- **Rules:** `AGENTS.md` §1.1 Currency Policy; `CLAUDE.md` currency section; `README.md` currency note.
- **Regression guard:** `test:inr` Test Suite 8 scans `src/` for SGD labels outside a documented allowlist.
- **Verified after these changes:** typecheck clean; `test:inr` **19/19**; `test:booklet` 27/27; lint 0 errors (24 pre-existing warnings); production build compiled successfully (all re-run 2026-10-27 after the INR edits).

### 2026-10-27 · Session: documentation pack (this task — code untouched)
- Rewrote stale `README.md` (it described a missing-tree workspace export, claimed lint was broken and no tests existed, listed disabled payment rails as active, and omitted the booklet system). Created `PROJECT_OVERVIEW.md`, `FEATURE_STATUS.md`, `DATABASE_AND_API.md`, `TESTING_AND_DEPLOYMENT.md`, `KNOWN_ISSUES_AND_TODO.md`, `HANDOFF.md`, this file. `docs/ADC_HANDOFF.md` (2026-10-15) is **superseded** by this pack but left in place for history.

## Important fixes worth remembering

1. **Turbopack + missing Tailwind shades**: referencing a non-existent `brand-*` shade inside `@apply` (e.g. `dark:ring-brand-400/60`) makes Turbopack mark `globals.css` unparsable and 500s the whole app. Fix = complete the palette; check the dev log for `The 'X' class does not exist`.
2. **Two dev servers on one `.next`** corrupt generated types (`.next/dev/types/*`). Never run `next dev` twice in the same directory; kill the old PID first (Next 16 refuses anyway) and delete `.next/dev/types` if corrupted.
3. **`next/script` + inline children** triggers React 19 hydration warnings; use raw inline `<script dangerouslySetInnerHTML>` for the theme-init.
4. **JSX mixed text + `{expr}`** produces SSR `<!-- -->` separators — never regex-assert across those boundaries in tests; emit single template-literal text nodes instead.
5. **Grammarly/browser extensions** inject `data-gr-*` attributes on `<body>` → `suppressHydrationWarning` on `<body>` (already applied).

## Known regressions / follow-ups at handoff

See [`KNOWN_ISSUES_AND_TODO.md`](KNOWN_ISSUES_AND_TODO.md). Notably: lint/build should be re-run on the current tree; visual QA pass pending after the study redesign; hand-rolled admin tables; 20+ pre-existing lint warnings.

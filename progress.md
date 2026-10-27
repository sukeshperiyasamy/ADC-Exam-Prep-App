# Project Progress & Session Handoff Log

## 1. Project Overview
- **Project Name:** ADC Exam Prep App
- **Live Production URL:** [https://adc-exam-prep-app.vercel.app/](https://adc-exam-prep-app.vercel.app/)
- **Repository:** `sukeshperiyasamy/ADC-Exam-Prep-App`
- **Purpose:** Full-stack SaaS exam preparation platform for candidates taking the Australian Dental Council (ADC) examination, featuring timed clinical scenario mock tests, domain scoring, and instant entitlement granting for the ₹1,499 comprehensive preparation bundle.

---

## 2. Current Architecture
- **Framework & Runtime:** Next.js 16 (App Router), React 19, TypeScript, Vercel Serverless (Node.js engine)
- **Database:** Neon Serverless PostgreSQL with Prisma ORM
- **Authentication:** NextAuth.js (Session JWT, Credentials with Argon2, OAuth adapters, Email/OTP)
- **Active Payments:** Stripe Checkout in Indian Rupees (INR, ₹), authoritative bundle price stored in DB as `149900` paise
- **Order & Access Pipeline:**
  - Client initiates checkout with `bundleId` (zero client-side pricing).
  - Server mints `Order` in `PENDING` state and initializes payment gateway session.
  - Webhook receives raw HTTP body, validates cryptographic signature (HMAC-SHA256), and deduplicates via `PaymentWebhookEvent`.
  - Transactional `fulfillOrder()` updates order to `PAID`, upserts `Entitlement`, mints GST tax `Invoice`, and dispatches purchase email with PDF receipt.
  - Exam attempt routes gate access strictly based on database `Entitlement` records.

---

## 3. Current Git Branch and Working-Tree State
- **Active Branch:** `main`
- **Latest Commit:** `eb9dc58` (`feat(branding): implement custom molar checkmark logo and multi-resolution favicon suite`)
- **Working Tree State:** Clean, tracking workflow infrastructure files:
  - `AGENTS.md` (updated with permanent agent manual)
  - `features.json` (created machine-readable backlog)
  - `init.sh` (created safe session inspector script)
  - `progress.md` (created progress log)
  - `docs/future-plans/CASHFREE_PAYMENT_GATEWAY_INTEGRATION.md` (created future specification)

---

## 4. Current Development Objective
- **Current Objective:** Establish a persistent, test-driven agent workflow infrastructure.
- **Scope:** Workflow configuration only (`AGENTS.md`, `features.json`, `init.sh`, `progress.md`).
- **Product Features:** No product features implemented in this session.

---

## 5. Current Feature ID
- **Feature ID:** `WORKFLOW-SETUP` (Infrastructure only)
- **Active Product Feature:** None (Ready for selection in next session).

---

## 6. Last Completed Task
- Implemented and verified the persistent agent workflow files (`AGENTS.md`, `features.json`, `init.sh`, `progress.md`) adhering to test-driven, one-feature-at-a-time policies.
- (Prior product task: Prepared and saved the complete Cashfree Payment Gateway future specification to `docs/future-plans/CASHFREE_PAYMENT_GATEWAY_INTEGRATION.md`).

---

## 7. Changes Made in the Latest Session
- Created production-grade Antigravity Agent Skill `frontend-design-director` at `.agents/skills/frontend-design-director/SKILL.md` with official frontmatter, role definitions, and a 7-step optimization loop (Inspect, Specify, Build, Observe, Critique, Refine, Verify) tailored for fast coding models (Gemini Flash).
- Created full suite of supporting reference files under `.agents/skills/frontend-design-director/references/`:
  - `design-principles.md`: Clinical exam prep design philosophy, tokens (Clinical Teal, Slate neutrals, feedback tokens), and typography scales.
  - `visual-qa.md`: Real-browser visual QA checklist, viewport matrix (Desktop, Tablet, Mobile), Playwright/`browser_subagent` procedures, and top-3 defect ranking rubric.
  - `design-patterns.md`: Production-ready patterns for clinical exam simulators, high-trust landing pages, transparent checkout, and candidate analytics.
  - `critique-and-refine.md`: Adapted Impeccable critique calibration actions (`critique`, `distill`, `harden`, `polish`, `calibrate`), anti-AI-slop checks, and clinical edge-case hardening without CLI overhead.
  - `conversion-strategy.md`: Adapted Elaya single-intent conversion architecture ($1 \text{ Offer} \rightarrow 1 \text{ Audience} \rightarrow 1 \text{ Action}$), objection handling, above-the-fold anchors, and frictionless checkout for the ₹1,499 bundle.
- Configured explicit on-demand lazy loading in `SKILL.md` and registered `frontend-design-director` in `AGENTS.md` to prevent token bloat during routine coding tasks.

---

## 8. Files Modified / Created
- `.agents/skills/frontend-design-director/SKILL.md` (new/updated with lazy-loading policy)
- `.agents/skills/frontend-design-director/references/design-principles.md` (new)
- `.agents/skills/frontend-design-director/references/visual-qa.md` (new)
- `.agents/skills/frontend-design-director/references/design-patterns.md` (new)
- `.agents/skills/frontend-design-director/references/critique-and-refine.md` (new)
- `.agents/skills/frontend-design-director/references/conversion-strategy.md` (new)
- `AGENTS.md` (updated on-demand skills list in Section 8)
- `progress.md` (updated)

---

## 9. Tests and Commands Actually Executed
- Skill file syntax & frontmatter validation: Verified YAML frontmatter and markdown structure in `.agents/skills/frontend-design-director/SKILL.md`.
- Reference file completeness: Verified all 5 reference files in `.agents/skills/frontend-design-director/references/`.
- TypeScript verification: Ran `npm run typecheck` (`tsc --noEmit`) to ensure clean compilation across all codebase typings.
- Git status check: `git status -s` confirming working tree cleanly tracks modified/created files.

---

## 10. Verification Results
- `frontend-design-director`: YAML frontmatter validated, action criteria defined, 7-step loop specified.
- Reference files: All 5 modular reference files verified and linked via lazy-loading on-demand rules.
- `npm run typecheck`: Passed with 0 errors.
- Strict scope adherence: No packages installed, no global settings modified, zero application pages redesigned.

---

## 11. Known Issues and Failing Tests
- **Zero failing tests or build issues.**
- Note: Next.js build emits an informational warning regarding multiple lockfiles detected in parent directories (`C:\Users\sukes\package-lock.json`); build compiles cleanly with code `0`.

---

## 12. Decisions Made and Reasons
- **Preserved `## graphify` Section in `AGENTS.md`:** The repository's AST knowledge graph rules were preserved at the top of `AGENTS.md` to prevent regressing existing graph query workflows.
- **Cashfree Backlog Status Kept as `backlog`:** In strict adherence to user instructions, Cashfree integration was cataloged as `FEAT-006` in `features.json` and kept in `backlog` with zero code implementation.
- **Secret-Safe `init.sh`:** Environment variable checks in `init.sh` check key presence only (`[CONFIGURED]` vs `[NOT SET]`), ensuring private keys or tokens are never echoed to terminal logs.

---

## 13. Blockers and Pending Questions
- **None.** Workflow infrastructure is fully established and ready for the next feature.

---

## 14. Real-Browser UI Quality Audit & Findings (frontend-design-director)
- **Tooling Executed:** Native Antigravity `browser_subagent` inspecting `http://localhost:3040` (Desktop 1440×900 and Mobile 390×844) and `http://localhost:3040/practice-exams`.
- **Three Highest-Impact UI Defects Identified:**
  1. **Practice Exams Catalog Void & Generic Filters (`/practice-exams`):** The primary CTA destination ("Explore Mock Tests") displays a near-empty screen (65%+ white void) with a single lonely bundle card and generic IT certification filter dropdowns ("All exam groups", "All levels: Foundational, Associate, Professional, Specialty") completely divorced from dental clinical specialties. No clear "Start Free Teaser" vs "Enroll" actions.
  2. **Hero Search Clipping & Floating Overlay Collision (`/`):** In the homepage hero, the search placeholder `Search clinical topics (e.g., Periodontics, TMJ, Endodo...` is clipped against the inline Search button. The floating WhatsApp widget has an oversized glow that obscures content near the fold, and development badges collide with footer text.
  3. **Candidate Status & Entitlement Ambiguity:** Across navigation and catalog views, candidates lack visual clarity on whether they are in Guest/Teaser mode or have an Active Paid Entitlement, creating uncertainty about what clicking an exam will initiate.

---

## 15. Completed Implementation: `/practice-exams` Catalog & Practice Hub Redesign
- **Files Modified:**
  - `src/app/practice-exams/page.tsx`: Implemented dual-card architecture (10-question Free Practice Teaser vs. Full ADC Preparation Bundle), verified entitlement status badge (`Enrolled Candidate` vs. `Guest Mode`), and 7-domain clinical curriculum breakdown grid.
  - `src/app/practice-exams/filters.tsx`: Replaced generic IT vendor/level dropdowns with dental specialty filter pills with exact counts and keyword search.
- **Data & Business Logic Faithfully Reused:**
  - Database question counts: 187 published questions across 7 clinical disciplines.
  - Teaser count: 10 randomized scenario MCQs (`isTeaser: true`).
  - Mock exam simulation parameters: 60 questions, 180 minutes, 70% passing score.
  - Entitlement check: Reused database query checking `Entitlement` table for active rows (`PRACTICE`, `BUNDLE`, `ADMIN_GRANT`).
  - Stripe INR checkout: Direct link to `/checkout/bundle/adc-written-exam-prep-bundle` with authoritative ₹1,499 price.
  - Zero unsupported external claims: Domain distributions labeled as question pool counts and percentages without claiming unverified official weight mandates.

---

## 16. Verification & Browser Testing Results
- **TypeScript Typecheck:** `npm run typecheck` (`tsc --noEmit`) passed with exit code `0` (zero errors).
- **Desktop Browser QA (1440×900):**
  - Verified screenshot: `practice_exams_desktop_redesign_1792101802050.png`
  - Dual cards render in balanced 2-column layout; 7 discipline cards fill the previously empty void with zero horizontal scroll.
  - Interactive filter test: Clicked `Periodontics, Oral Surgery & Pain Management (53)`, verified filter notification banner, and verified reset (`practice_exams_filtered_desktop_1792101817727.png`).
- **Mobile Browser QA (390×844):**
  - Verified screenshot: `practice_exams_mobile_redesign_1792101836040.png`
  - Cards stack cleanly; touch targets are ≥44px; domain pills wrap without overflow; CTAs remain fully accessible.
- **Unresolved Defects:** **Zero**.

---

## 17. Next Recommended Action
- Present visual verification evidence to user for sign-off.
- Ready for next backlog feature selection (`FEAT-004` or `FEAT-005`).

---

## 18. Features Explicitly Deferred
- **Cashfree Payment Gateway Integration (`FEAT-006`):** Kept in `backlog`.

---

## 19. Production Deployment and Approval Status
- **Current Production Status:** Live on Vercel at `https://adc-exam-prep-app.vercel.app/`.
- **Payment Routing:** Active on Stripe INR (₹1,499 bundle).
- **Deployment Authorization:** Awaiting user instruction before push or deploy.

---

## 20. Final Pre-Commit Review & Verification
- **Published Refund Policy Verification:**
  - Audited `src/lib/pages.ts` and `src/app/p/[slug]/page.tsx` (`slug: 'refund-policy'`).
  - Found published policy states: *"Full refund within 7 days of purchase if you have answered fewer than {{TEASER_N}} questions across all attempts."*
  - Corrected previous claim in `src/app/practice-exams/page.tsx` from "fewer than 2 attempts" to match exact published terms: *"Eligible within 7 days of purchase if you have answered fewer than 10 questions across all attempts. See our Refund Policy."* Added direct link to `/p/refund-policy`.
- **Entitlement Authorization & Expiry Rules:**
  - Reused `db.entitlement.findFirst` for tiers `['PRACTICE', 'BUNDLE', 'VOUCHER', 'ADMIN_GRANT']`.
  - Added explicit expiry handling `OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]` ensuring revoked or expired entitlements are not treated as active.
- **Route Validation for All CTAs & Links:**
  - Teaser CTA: Points to `/practice-exams/${vendorSlug}/${examSlug}/teaser` (Route Handler `GET`/`POST` minting guest attempt token and creating teaser attempt).
  - Enrolled Candidate CTA: Points to `/practice-exams/${vendorSlug}/${examSlug}` (Exam preparation workspace where enrolled candidates select Practice Mode or Timed Simulation Mode).
  - Unenrolled Candidate CTA: Points to `/checkout/bundle/${bundleSlug}` (Stripe INR checkout).
  - Filter pills & search: Points to `/practice-exams` with query parameters `domain` and `q`.
- **Backlog Tracking (`features.json`):**
  - Added `FEAT-007` ("Practice Exams Catalog & Practice Hub Redesign") with status `verified`.
- **Verification Commands Executed:**
  - `npm run typecheck` (`tsc --noEmit`): Passed with exit code `0`.
  - `git status`: Confirmed exactly 4 intended files (`features.json`, `progress.md`, `src/app/practice-exams/filters.tsx`, `src/app/practice-exams/page.tsx`).

---

## 21. Broken Homepage Link & Canonical Route Resolution (FEAT-008)
- **Feature ID:** `FEAT-008`
- **Status:** `done`
- **Files Modified:**
  - `src/app/page.tsx`: Fixed exam details CTA href to use canonical vendor slug `/practice-exams/adc/adc-written-examination-part-1`.
  - `src/components/footer.tsx`: Updated Terms of Service link directly to `/p/terms` without requiring redirect.
  - `src/lib/pages.ts`: Aligned `DEFAULT_PAGES` slug from `'terms-of-service'` to `'terms'`, matching canonical `next.config.mjs` destination.
  - `src/app/p/[slug]/page.tsx`: Added fallback support in `loadPage` for both `'terms'` and `'terms-of-service'`.
  - `features.json`: Tracked FEAT-008 as `done`.
---

## 22. Link Fixes Secured on Main & Exam Engine Hardening Preparation (FEAT-004)
- **Phase 1 Verification:**
  - Reviewed commit `ebcd83c` diff across `src/app/page.tsx`, `src/components/footer.tsx`, `src/lib/pages.ts`, and `src/app/p/[slug]/page.tsx`.
  - Confirmed strictly minimal fixes: 1-line ADC vendor slug correction, 1-line direct `/p/terms` link in footer, 1-line canonical slug alignment in `DEFAULT_PAGES`, and 1-line backward-compatible alias fallback in `loadPage`.
  - Ran `npm run typecheck` (`tsc --noEmit`): Passed with exit code `0`.
  - Ran `npm run check:links` (`node scripts/check-local-links.mjs`): 56/56 crawled URLs passed with exit code `0`.
  - Push status: Clean working tree, commit `ebcd83c` pushed to `origin/main`.
- **Phase 2 Code Audit:**
  - Inspected `src/lib/attempts.ts`, `src/app/api/attempts/submit/route.ts`, and `scripts/test-exam-engine.ts`.
  - Identified edge-case vulnerabilities:
    - Empty or invalid `correct` key in DB questions allows unanswered (`[]`) questions to evaluate as correct due to `[].length === [].length && [].every(...)`.
    - Missing questions in DB reduces denominator `total` from `attempt.questionIds.length` to `questions.length`.
    - Passing boundary calculation at 70% vs rounding rules (`Math.round((correctCount / total) * 100)`).
  - Drafted test-first plan for pure in-memory unit tests in `scripts/test-exam-scoring-unit.ts`.
  - Status of `FEAT-004` transitioned to `in_progress` in `features.json`.

---

## 23. Exam Engine Hardening Implementation & Test-First Execution (FEAT-004)
- **Unit Test Suite Implemented (`scripts/test-exam-scoring-unit.ts`):**
  - Group 1: Question Types (`SINGLE`, `MULTI`, `ORDERING`, `TRUE_FALSE`) — 10 tests.
  - Group 2: Unanswered Answers & Malformed Keys — 4 tests.
  - Group 3: Score Boundaries & Rounding (0%, 50%, 69%, 70%, 100%, rounding cases 2/3, 5/7, 4/7, and empty question set) — 7 tests.
  - Group 4: Per-Domain Breakdown Integrity — 1 test.
  - Group 5: Denominator Integrity & Expected Question Count Validation — 3 tests.
- **Defects Captured & Hardened:**
  - `isAnswerCorrect` hardened in `src/lib/attempts.ts`:
    - Guards against non-array candidate answers (`!Array.isArray(answer)`).
    - Prohibits scoring on empty, null, undefined, or non-array `correct` answer keys (`!Array.isArray(q.correct) || q.correct.length === 0`).
    - Guarantees set equality without duplicates on `MULTI` questions (`a.size === correct.length`).
  - `validateAttemptQuestions` implemented in `src/lib/attempts.ts`:
    - Validates that every ID in `attempt.questionIds` is present in retrieved database questions.
  - Submission gating in `src/app/api/attempts/submit/route.ts`:
    - Rejects submission with HTTP 422 if database question retrieval is incomplete, preventing score calculation on corrupted or partial attempts and preserving the attempt record.
- **Verification Commands Executed:**
  - `npm run test:scoring`: 25/25 unit tests passed with exit code `0`.
  - `npm run typecheck`: Passed with exit code `0`.

---

## 24. Study booklets (AI textbook feature)
- Added Booklet/Chapter/Page/Figure/Item/Progress/Bookmark models (migration `20261021000000_add_study_booklets`), admin import/convert/review/publish UI, student library + six study modes, booklet MCQ practice + timed mock (reuses Attempt/runner/scoring), private figure proxy, entitlement gating via a hidden access Exam.
- Tests: 25 unit + 27 integration (local PG, mocked Gemini) + 17 HTTP e2e (local dev server) + 25 existing scoring; `npm run typecheck` and `npm run build` pass.
- Real data: eTG "Local anaesthetics in dentistry" (PDF 58-65) converted into a LOCAL DB as DRAFT (47 items, 10 MCQs, 1 figure, 1 fact-check finding). Not published; licence unconfirmed.
- Incident: first `prisma migrate deploy` hit the Neon `production` DB (directUrl not overridden) and applied the additive booklet migration there. No data changed.

---

## 25. App-Wide UI Consistency & Design-Token Normalization (FEAT-009)
- **Feature ID:** `FEAT-009` — status `done`.
- **Audit method:** 4 parallel Explore code audits (public+auth, user dashboard, exam/results/checkout, admin dashboard) + live browser baseline (desktop 1440×900 screenshots of `/`, homepage footer, `/practice-exams`) before edits.
- **Design system formalized:** brand teal = brand/CTA color, blue = interactive selection/info accent, green = success, red = error, amber = pending/warning. Marketing/checkout/begin CTAs → `btn-primary-grad`; in-app form/utility primaries → `btn-primary`; secondary → `btn-outline` / new `.btn-sm-outline` (h-8, pairs with `.input-sm`).

### Token fixes (tailwind.config.ts)
- Completed the brand teal scale: added `200: '#99f6e4'`, `400: '#2dd4bf'`, `950: '#042f2e'`. Pre-existing `dark:bg-brand-950` usages (homepage hero badge etc.) were silently not compiling before this.

### Global (globals.css)
- Added app-wide `:focus-visible` ring (brand-600/400 + offset) — the app previously had zero keyboard focus styling outside `.input`. Form `.input` keeps its softer focus ring via layer cascade.
- Added `.btn-sm-outline` utility; raised `.btn-secondary` dark-mode background contrast (brand-900/60).
- Removed dead `bg-white` on `<body>` (layout.tsx) so the intended `#f7fbfb` tinted base background renders; dark mode unaffected.

### Incidents during this session
- First version of the `:focus-visible` rule referenced `dark:ring-brand-400/60` but `brand-400` did not exist in the palette → Turbopack marked globals.css unparsable and the dev server 500'd on every page. Root-caused via dev-server log (`The 'dark:ring-brand-400/60' class does not exist`), fixed by completing the brand palette. Server verified healthy (all routes 200) after the fix.

### Files modified (37 source files)
- Tokens/layout/chrome: `tailwind.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `footer.tsx`.
- Public: `src/app/page.tsx` (emerald→green, teal accents), `practice-exams/page.tsx` + `filters.tsx` (all teal-*→brand-*, removed rounded-xl CTA shape overrides), `practice-exams/[vendor]/[slug]/page.tsx` + `bundle-as-exam-view.tsx` (muted copy dark variants, blue icons→brand).
- Auth: `login` (dark variants, tab bar dark mode, second h1→h2, submit→btn-primary-grad), `signup`, `forgot-password`, `set-password`, `verify-otp` (dark variants + tracking-tight h1s + grad submits).
- Exam/results: `exam-runner.tsx` (selected option dark border/ring, Saved indicator green, review modal overlay /60), `results/[attemptId]/page.tsx` + share page (tracking-tight, dark text, badge tones aligned to runner), `review-form-modal.tsx` (card panel, slate-950/60 overlay, icon-btn close, outline cancel, .input textarea), `share-score.tsx`, `share-buttons.tsx` (→btn-sm-outline), `explanation-view.tsx` (emerald/rose→green/red).
- Checkout: `payment-methods.tsx`, `billing-address-card.tsx` (.input fields, outline cancel, ring-1 selected, green DEFAULT badge), `promo-code.tsx` (btn-sm-outline, green applied chip), `paynow-modal.tsx` (card panel, formatPrice()), `checkout/page.tsx` + `bundle-checkout-client.tsx` + `success/page.tsx` (emerald→green), `processing/page.tsx` (aligned to success/failed status-page layout: card + icon circle + 3xl heading).
- User dashboard: `attempts`, `orders`, `invoices`, `vouchers` (dark-safe badges/empty states/subtitles, `.badge` shapes, `btn-sm-outline` PDF button), `page.tsx` (h1 2xl, green stat accent), `exams`, `settings`, `user-chrome.tsx`, `my-exams-list.tsx` (Open CTAs → btn-primary-grad), `study/page.tsx` + `[booklet]/page.tsx` + `[chapter]/page.tsx` (tracking-tight h1s, blue link tokens unified to 600/400, unlock banner unified, membership pill → badge-brand, p-8 empty states), `booklet/client.tsx` (ModeCompleteButton → grad, dark hovers), `booklet/toc.tsx` (.card dedupe, h-2 progress bars, green badge tones, removed bespoke blue focus ring), `booklet/admin-client.tsx` (dark variants on all badges/AI-issue cards, .input file input, muted text).
- Admin: `admin-chrome.tsx` (sidebar active blue→brand), `filter-bar.tsx` (Apply blue→brand — propagates to every filtered page), 18 admin pages/clients (blue-600 & emerald-600 solids → brand-700/800, rose→red, violet→blue, `text-2xl font-bold` h1s → PageHeader scale `text-xl font-semibold tracking-tight`, missing dark variants on badges/muted text/links, vouchers grad row-actions → btn-primary, section-form.tsx settings input → `.input`).
- Lint blocker fixed (pre-existing, in uncommitted booklet work): `figure-storage.ts` `useR2()` → `shouldUseR2()` (rules-of-hooks false positive).

### Verification commands executed
- `npm run typecheck`: PASS (0 errors).
- `npm run lint`: 0 errors, 21 pre-existing warnings (react-hooks/set-state-in-effect etc.).
- Route smoke tests (`curl` against `npm run dev -- -p 3040`): `/`, `/practice-exams`, `/login`, `/signup`, `/forgot-password`, `/verify-otp`, `/vendors`, `/p/terms`, `/p/refund-policy`, `/bundles/adc-written-exam-prep-bundle`, `/checkout/processing` all 200; `/user-dashboard`, `/admin-dashboard` 307 (auth redirect, expected).
- Compiled dev CSS inspected: no `unparsable` markers; `brand-950`, `focus-visible`, `btn-sm-outline` utilities present.

### Known deferred items
- Hand-rolled admin tables (questions, pages, vendors, booklets, api-tokens, reports/revenue, admins) not migrated to shared `DataTable` — functional refactor, left for a dedicated session.
- Post-fix screenshot re-verification pending: the ZCode browser bridge (DeferredToolCall) broke mid-session with a harness-side validation error and could not be used for the final visual pass. Baseline screenshots were captured pre-fix; changes are class-level normalizations verified via typecheck/lint/CSS/route checks. Recommend a quick light+dark visual pass at 1440×900 and 390×844 next session.
- WhatsApp/social-login brand hexes intentionally kept (third-party brand colors).
- Exam runner: header "Submit exam" stays `btn-primary-grad` vs footer "Next" `btn-primary` — deliberate high-stakes emphasis.

### Follow-up fix (2026-10-27): React 19 hydration warning on theme-init script
- **Symptom:** console error on client render — "Encountered a script tag while rendering React component… never executed when rendering on the client", pointing at `<Script id="theme-init" strategy="beforeInteractive">` in `src/app/layout.tsx`.
- **Cause:** `next/script` renders an inline child script during client hydration; React 19 refuses to execute script tags rendered by client components (browser-consistent, since the server already ran it from SSR HTML).
- **Fix:** replaced the `next/script` component with a raw inline `<script dangerouslySetInnerHTML>` as the first child of `<body>` — the same warning-free pattern the JSON-LD script below it already used. Execution timing is unchanged (inline body scripts run synchronously before any content paints, so the no-flash theme behavior is preserved). The Plausible `next/script` usage (external `src`, `afterInteractive`) is correct and untouched.
- **Verified:** `npm run typecheck` passes; `/` and `/practice-exams` serve 200 with `<script id="theme-init">` present in the SSR HTML; zero `beforeInteractive` remnants.

---

## 26. Booklet Access-Policy Change: License Flag Decoupled from Student Visibility
- **Directive:** paid eligible users must reach booklets designated for them without an additional licensing-confirmation gate on visibility; licensing stays a publication safeguard.
- **Audit result — every gate found (`src/lib/booklet/`):**
  - Student-visibility gates that checked `licenseConfirmed` (3, all removed): `access.ts isChapterLive` (line 12), `queries.ts loadLibrary` where-clause (line 61), `queries.ts loadBookletForStudent` early-return (line 97).
  - Publication safeguards KEPT (mandatory): `chapterPublishBlockers` requires licence confirmation + named clinical reviewer + no DRAFT items + no unresolved high-severity issues; `admin-actions.updateBooklet` requires a licence note to confirm, refuses unnoted confirmations, and reverts booklet status to DRAFT when licensing is revoked; chapter publish/booklet publish gates unchanged.
  - Gates that were never license-related and are unchanged: publication status (`PUBLISHED` + chapter `publishedAt`), clinical review (`reviewStatus APPROVED`, APPROVED items only, approved figures only, PUBLISHED MCQs only), auth (`login-required`), entitlement tiers PRACTICE/BUNDLE/VOUCHER/ADMIN_GRANT with active `expiresAt` (incl. ADC-PART1 code + published-bundle siblings), free-preview (`isFreePreview`, signed-in), admin bypass. All student APIs (attempts, figures proxy, page inspector, progress, bookmarks) route through `decideAccess`/`resolveViewer` — no API bypasses the policy.
- **eTG booklet `tg-oral-dental` (read-only inspection via `scripts/inspect-etg-readonly.ts`, local DB):** status DRAFT, `licenseConfirmed: false` (note: "we are serving for limited people" — not valid licensing evidence), all **42 chapters** `reviewStatus: DRAFT` with no named reviewer and `publishedAt: null`, **1924/1924 items DRAFT**, 420 MCQ rows, 111 figures, 357 page records. Unavailable to students for reasons entirely independent of the visibility gate: DRAFT booklet + unreviewed/unpublished chapters. Removing the visibility gate does NOT change its availability. Its status/flags/chapters/content were NOT modified.
- **Test updates:** `scripts/test-booklet-unit.ts` now asserts the new policy (unlicensed-but-published chapters visible; entitled student passes with flag off; unreviewed chapter still not live); `scripts/test-booklet-integration.ts` adds "licence flag alone does not gate student visibility of a published booklet" (direct-DB PUBLISHED+flag-off state → entitled access ok; DRAFT+flag-on still hidden) and renames the draft-booklet test; `scripts/test-booklet-http.ts` adds the same policy check over HTTP with restore-in-finally.
- **Pre-existing test bug fixed:** the free-preview library badge mixed static JSX text with expressions, so React SSR emitted `Free Preview · <!-- -->1<!-- --> Chapter Free` and the HTTP regex could never match. Badge now renders a single template-literal text node (`src/app/user-dashboard/study/page.tsx`).
- **Test-environment note:** the HTTP suite's 503 no-credentials check fails if Vertex AI env vars (`GOOGLE_CLOUD_PROJECT`, `GOOGLE_APPLICATION_CREDENTIALS`, `GEMINI_API_KEY`) are set — they are now set in `.env` from the booklet pilot. The suite was run with those vars emptied at the shell level (NOT by editing `.env`), matching the suite's documented no-Gemini contract. No real Gemini/Vertex call was made (verified: conversion failed fast at text extraction on the synthetic PDF).
- **Verification:** `npm run test:booklet` 27/27 ✓ · `npx tsx scripts/test-booklet-integration.ts` 37/37 ✓ (throwaway `booklet_test` DB) · HTTP e2e 21/21 ✓ (dev server 3041 on throwaway DB) · `npm run typecheck` clean. Dev DB (`adc_local`) untouched except read-only SELECTs; production/Neon never connected to.

---

## 27. Booklet Access Approval & Complete UI Polish (FEAT-010)
- **Phase 1/2 (paid access re-verified in current code):** the only `licenseConfirmed` references left in `src/lib/booklet/` are the type field and `chapterPublishBlockers` (publication safeguard). Student visibility, library listing, chapter reader, and every student API route (attempts/figures/page-inspector/progress/bookmarks) resolve through the shared `decideAccess`/`resolveViewer`/`hasBookletEntitlement` helpers — entitlement tiers PRACTICE/BUNDLE/VOUCHER/ADMIN_GRANT (incl. ADC-PART1 + published-bundle siblings) with active `expiresAt`. No further gate removal was needed; no gate was weakened this session.
- **Phase 3 (eTG `tg-oral-dental`, read-only re-inspection):** STILL status `DRAFT`, `licenseConfirmed: false` (note "we are serving for limited people" — not valid licensing evidence), all **42 chapters** `reviewStatus: DRAFT` with no named reviewer and `publishedAt: null`, 1,924/1,924 items DRAFT. Per the directive, the publication/clinical-review safeguards were NOT bypassed: the booklet was not published, no chapter was bulk-approved, no licensing flag was changed, and no licensing evidence was invented. **Remaining blocker for paid visibility: the publication workflow (booklet DRAFT + unreviewed/unpublished chapters + unconfirmed licensing).** The redesigned UI will surface the booklet automatically for paid users once it is published through the existing workflow.
- **Phase 4 (UI redesign, design-system reuse only):**
  - `src/components/booklet/library-browser.tsx` (NEW, client): compact search, access-filter pills with counts (All/Full Access/Free preview/Purchase required), redesigned booklet cards (title, status badge preserving exact test strings `Full Access` / `Free Preview · N Chapter(s) Free`, publisher·edition line, 2-line description, progress bar only when progress exists, contextual CTA: Start reading / Continue learning / Review chapters, chapter count). Empty/no-match states.
  - `src/app/user-dashboard/study/page.tsx` (rewrite): title + tightened description, enrolled pill, single compact unlock banner (non-entitled only, heading preserved for tests), data shaping (edition extraction, access state, CTA) into serializable cards.
  - `src/components/booklet/toc.tsx` (rewrite): polished collapsible sections (brand index chip, chapter/PDF-range/completed meta, mini progress), chapter rows with current-chapter highlight + "Current" badge, completed/locked/free-preview states, in-chapter progress bar only when started; explicit note that section groupings are reconstructed, not the publisher's original TOC; NEW `ChapterRail` compact sidebar for the reader.
  - `src/app/user-dashboard/study/[booklet]/page.tsx` (rewrite): breadcrumb back-link, header with publisher + real completion count, description column, admin-preview notice, two-card row (mock test + access summary with per-count unlock CTA), polished TOC.
  - `src/app/user-dashboard/study/[booklet]/[chapter]/page.tsx` (rewrite): full breadcrumbs (Study Library › booklet › chapter), sticky study-mode pill bar under the site header, `max-w-3xl` reading column, brand-accented concept chips, XL two-column layout with sticky `ChapterRail`, previous/next chapter navigation across chapters the viewer can open, polished locked state (keeps asserted "Unlock this booklet"), icon empty state, bookmarks aside preserved.
- **Clinical content untouched:** no source text, doses, warnings, page mappings, or figures were modified — styling and layout only.
- **Tests:** `scripts/test-booklet-integration.ts` adds "hierarchy groups cover every chapter exactly once (no duplicates or omissions)" (5-chapter booklet → flat hierarchy = 5 unique); `scripts/inspect-toc-readonly.ts` (NEW, read-only) verified the real eTG booklet: **42 chapters → 9 groups → 42 flattened, 42 unique ids, zero unmatched**.
- **Verification:** `npm run typecheck` clean ✓ · `npm run test:booklet` 27/27 ✓ · integration **38/38** ✓ · HTTP e2e **21/21** ✓ (throwaway DB + dev server 3041, Gemini vars emptied at shell) · `npm run lint` 0 errors (24 pre-existing warnings) · **`npm run build` succeeded** (all study routes compiled dynamic). Database: only read-only SELECTs on the local dev DB; no migrations, no production contact, no payment/pricing changes, no licensing/publication flag changes.


---

## 28. INR Enforcement Across the Application (FEAT-011)
- **Underlying logic fix (write-side):** `src/lib/invoice/issue.ts` no longer computes or stores SGD-equivalent snapshots (`fxRateBpsToSgd` / `totalSgd`) for new invoices — INR-only product. Historical rows keep their stored values; credit notes still mirror legacy originals for accounting consistency. `FX_TO_SGD_*` settings keys removed from `src/lib/settings.ts` + admin settings UI.
- **SGD display removed:** admin invoices list (≈ SGD rows + aggregate suffix), invoice detail page, tax report (SGD-equivalent summary row, Total (SGD) column, per-invoice cell), invoice PDF (SGD footnote), weekly worker report email, revenue analytics aggregation (taxSgdTotal/totalSgd dropped; honest byCurrency breakdown kept). Checkout methods API already INR-only (Stripe authoritative; PayNow/HitPay/PayPal hard-disabled).
- **Dead PayNow UI path removed:** paynow-modal.tsx + lib/payments/paynow.ts deleted; picker META entry + MethodId member removed; checkout client PAYNOW branches/state removed. /api/paynow/confirm (legacy reconciliation) and /api/paynow/create-order (INR-only rejection guard) retained.
- **Legacy formatters preserved with comments:** formatPrice (lib/utils), email handlebars, PDF money formatter render historical rows with explicit SGD labels — never relabeled, never silently converted (Intl renders SGD as bare "$" in many locales).
- **Rules:** AGENTS.md §1.1 Currency Policy (mandatory, read-before-work directive); CLAUDE.md "Currency policy" section; README currency note.
- **Regression guard:** test-inr-migration.ts Test Suite 8 scans src/ for SGD/S$ display strings outside a documented allowlist (legacy formatters + policy text) — fails the suite on any new SGD reference. Suite 3 made informational on fresh DBs.
- **Verification:** typecheck clean · test:inr 19/19 · test:booklet 27/27 · production build passes. No production data touched; no migrations; no payment-provider settings changed; Stripe INR routing untouched.

---

## 29. Permanent Fixes: Migration Reconciliation, Form Warning, Honest Revenue Reports
- **Prisma mismatch root cause:** the dev server was pointed at the REMOTE Neon DB (shared with production) which lacks `Order.providerStatus`; the LOCAL DB (adc_local, :55434) is fully migration-managed — `prisma migrate status`: 71 migrations, schema up to date. Fix: .env now targets the local DB (previous remote URLs preserved as commented lines), local schema verified via migrations. Production Neon untouched — applying migration 20261022000000_add_cashfree there remains an approval-gated deploy step.
- **Form warning root cause:** the vouchers-inventory server-action form carried a manual encType attribute (React sets multipart automatically). Removed; CSV upload behavior preserved (uploadInventory reads FormData file).
- **Revenue reporting honesty:** paidOrdersIn() now aggregates INR orders only and counts legacy non-INR orders separately (nonInrOrders); refunds filtered to INR via the order relation; revenueBy() buckets are per-currency (key includes currency) so legacy SGD amounts can never be summed under an INR label; revenue report headline stats were hardcoded USD — now INR with a legacy-exclusion note; %-of-gross column only for INR buckets. CSV export already carried per-row currency.
- **Regression suites added to test-inr-migration.ts:** Suite 9 schema-vs-migrations drift guard (prisma migrate diff --exit-code on a disposable shadow DB); Suite 10 per-currency revenue honesty (synthetic INR + legacy SGD orders, asserts isolated buckets and clean deltas, self-cleaning); Suite 11 server-action form guard (no encType/method on action forms).
- **Verification:** prisma validate pass; typecheck clean; test:inr 25/25 (incl. new suites); test:booklet 27/27; production build pass; admin orders query healthy on local DB. No production changes; no resets; no provider settings touched.

---

## 30. App-Wide Prisma/Database Mismatch Repair
- **Root cause:** a `.env.local` override (Next.js precedence > `.env`) pointed the dev server at the shared Neon DB, which lacks the uncommitted-schema columns (e.g. `Order.providerStatus`). The local DB (adc_local) was verified fully consistent: `prisma migrate status` (71 migrations, up to date), `migrate diff` live-DB↔schema = no difference, migrations↔schema = no drift.
- **Fix:** `.env` and `.env.local` now both target the local DB (previous remote URLs preserved as commented  lines); dev server restarted. Production Neon untouched — its pending migration (`20261022000000_add_cashfree`, adds `providerStatus` + payment lifecycle columns) remains approval-gated via `npm run db:deploy`.
- **New permanent safeguards:** `test:inr` Suite 12 (live-DB↔schema drift guard, local-only); booklet HTTP e2e dashboard smoke (admin orders/invoices/reports/tax + user orders must render); new permanent tool `scripts/smoke-core-routes.ts` (authenticated 17-route smoke using seeded admin credentials from .env, values never printed — incl. quote-stripping for .env parsing).
- **Also fixed this session:** vouchers-inventory server-action form `encType` warning removed (CSV upload preserved); revenue report honesty (INR-only headline totals via `paidOrdersIn` currency filter + `nonInrOrders` count; per-currency `revenueBy` buckets; hardcoded USD labels → INR; legacy-exclusion note); `AGENTS.md` rule 13 (schema changes require migrations).
- **Verification:** prisma validate pass; migrate status up-to-date; migrate diff (live↔schema) no difference; typecheck clean; test:inr **26/26**; test:booklet **27/27**; booklet HTTP e2e **22/22** (incl. dashboard smoke); production build pass; authenticated smoke **17/17 routes OK** on the running dev server — both reported pages (`/admin-dashboard/invoices`, `/user-dashboard/orders`) verified loading. No resets, no data loss, no production changes.

---

## 31. Chapter Page + TOC Visual Refinement
- Chapter header: title with right-aligned meta chips (PDF page-range chip, Completed/N-of-7-modes status), compact breadcrumbs retained.
- Study-mode nav: pill badges replaced with a segmented tab strip (underline-active brand accent, per-mode count chip, completed check).
- Reading area: section headings restyled (15px semibold, slate-950/white), notes use brand list markers, key-concept chips slimmed; PDF citation is now a single compact chip-button opening the source inspector.
- ModeCompleteButton: footer action row with helper text, solid/outline + Completed state.
- TOC: chapter rows converted from nested mini-cards to flat divide-y rows (number chip, title, PDF range + MCQ count, inline progress, status icons); section header slimmed (PDF range moved into rows); Draft badge simplified.
- Mobile: collapsible Chapters list (details/summary with ChapterRail) below xl; desktop keeps the sticky right rail — no duplicated info per breakpoint.
- Files: [chapter]/page.tsx, components/booklet/toc.tsx, components/booklet/client.tsx (ModeCompleteButton + CheckCircle2 import), components/booklet/source-inspector.tsx (citation chip).
- Verified: typecheck clean; test:booklet 27/27; booklet HTTP e2e 22/22 (all modes, locked state, progress, citations render); production build pass; authenticated smoke 17/17. No clinical content, flags, or routes changed.

---

## 32. OTP Abuse-Protection Hardening (Next Session Task)
- **Selected task:** KNOWN_ISSUES P1 #5 (security-first per handoff ordering). Audit found request-side caps already existed (per-IP in-memory + route-level verify limiter) but two gaps remained: (1) the per-email request cap was in-memory only — weak across serverless instances; (2) `verifyOtp()` was callable via the NextAuth otp provider (lib/auth.ts) without any brute-force cap — an unthrottled 6-digit guess surface on LOGIN.
- **Fix:** DB-backed per-email hourly request cap in `issueOtp()` (counts OtpCode rows, authoritative across instances); verify brute-force cap (10/hour/email) moved into `verifyOtp()` itself so both call paths are covered.
- **Tests:** new `scripts/test-otp-rate-limit.ts` — correct-code-rejected-after-10-wrong-attempts, DB-count cap refusal, fresh-email non-blocking — 3/3 pass. Also reworked the INR suite's historical-order check to be data-driven (per-order currency-label preservation instead of the stale ORD-000001=SGD fixture assumption that failed on local DBs with real INR orders).
- **Verified:** typecheck clean; test:otp 3/3; test:inr **28/28**; test:booklet 27/27; production build pass; dev server healthy.

---

## 33. Production-Readiness Audit — Blocked Pending User-Provided Phase 0 Results
- Verified: production up (200s on /, /login, /api/checkout/methods); Vercel CLI logged out (no auth.json); Neon URLs in .env/.env.local remain credential-masked; no user-provided Phase 0 results or result files present. Production commit identity therefore still unconfirmed (public fingerprints suggest pre-d1d8310).
- Completed the approval-independent deliverable: cashfree migration SQL review documented in DEPLOYMENT_CHECKLIST.md (additive-only, nullable columns, metadata-only default change, new table not idempotent, forward-only rollback via code promotion, no data modifications).
- Blocked on: Vercel deployment commit confirmation + Neon Phase 0 query results (migration state, providerStatus, PAID-order baseline, PITR status). No production access was used; no changes beyond documentation.
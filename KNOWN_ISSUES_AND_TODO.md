# KNOWN_ISSUES_AND_TODO.md — ADC Exam Prep

Verified issues and planned work as of 2026-10-27. Priorities: **P0** = do before next release · **P1** = next 1–2 sessions · **P2** = backlog. Machine backlog also lives in `features.json`.

## P0 — do first

1. **Commit the uncommitted working tree.** The INR-enforcement changes (≈20 files: `lib/invoice/issue.ts`, `lib/analytics.ts`, admin reports/invoices, `payment-methods.tsx`, checkout client, deleted `paynow-modal.tsx`/`payments/paynow.ts`), the agent-rules updates (`AGENTS.md` §1.1, `CLAUDE.md`, `README.md`), the regression-guard test, and this documentation pack are **not committed** (last commit: `d1d8310`). Run typecheck + lint + build once, then commit.
2. ~~Re-run lint and production build on the current tree.~~ DONE 2026-10-27: lint 0 errors (24 pre-existing warnings) and production build compiled successfully after the INR edits.
3. **Decide the eTG publication question.** `tg-oral-dental` is `DRAFT`, `licenseConfirmed: false` (the stored note — "we are serving for limited people" — is not licensing evidence), and all 42 chapters are clinically unreviewed. It stays invisible to students until someone with authority (a) confirms licensing with a real record, (b) has a named reviewer approve chapters, and (c) publishes via the admin workflow. **No code change can or should shortcut this.** Until then, `scripts/dev-booklet-fixture.ts` provides a synthetic published booklet for student-experience testing.

## P1 — near term

4. **Visual QA pass on the redesigned study surfaces** (library, TOC, chapter reader) at 1440×900 and 390×844 in light + dark modes, plus the INR-touched admin invoices/tax pages. The ZCode browser bridge broke mid-session earlier; screenshots after the redesign are still pending. Automated tests cover logic/rendering, not visual polish.
5. ~~OTP rate limiting / abuse protection.~~ **RESOLVED 2026-10-27:** request-side caps (per-IP in-memory + per-email DB-backed hourly count), single-live-code invariant, and a verify brute-force cap (10/hour/email) enforced inside `verifyOtp()` — covering both the `/api/otp/verify` route and the NextAuth otp provider path. Regression tests: `scripts/test-otp-rate-limit.ts` (3/3). Remaining nicety: swap the in-memory IP limiter for a shared store (e.g. Redis) if multi-instance abuse becomes a concern.
6. **Fix the `directUrl` production-DB hazard.** (Related, RESOLVED 2026-10-27: local dev was silently pointed at the shared Neon DB by a `.env.local` override — Next.js gives `.env.local` precedence over `.env`. Both files now target the local DB; the `test:inr` Suite 12 live-DB drift guard + `scripts/smoke-core-routes.ts` catch this class of misconfiguration. The commented  lines in `.env`/`.env.local` hold the Neon URLs for approved production deploys.) A past `prisma migrate deploy` reached Neon production because the local override was missing. Before any migration: verify `DATABASE_URL`/`DATABASE_URL_UNPOOLED` targets, and prefer explicit `prisma migrate deploy --url` or a guarded script. Consider a `pretest`/`predeploy` check that refuses non-local URLs outside CI.
7. **CI pipeline.** No `.github/workflows` exists. Add CI running `typecheck`, `lint`, `test:scoring`, `test:booklet`, `test:inr` (integration + HTTP need the embedded Postgres service + throwaway DB — scripts refuse non-local URLs by design).
8. **Email delivery proof.** Mail transports (SMTP / Gmail OAuth / service account) are configured via encrypted settings; outbound email has no automated coverage. Verify purchase-confirmation + OTP emails via MailHog (docker) or the configured SMTP in a staging run.

## P2 — backlog / tech debt

9. **Hand-rolled admin tables.** `questions`, `pages`, `vendors`, `booklets`, `api-tokens`, `reports/revenue`, `admins` pages implement their own tables/filters instead of the shared `DataTable`/`FilterBar`/`PageHeader` (`components/admin/*`). Migrate for consistency (functional refactor — do one page per diff).
10. **Lint warnings (≈24).** Pre-existing `react-hooks/set-state-in-effect` and `exhaustive-deps` warnings; 0 errors. Clean up opportunistically, not as a bulk churn.
11. **Cashfree integration (FEAT-006, backlog).** Scaffolding (`lib/payments/cashfree*.ts`, migration) is committed but **inactive**. Activating requires explicit user authorization and must follow `docs/future-plans/CASHFREE_PAYMENT_GATEWAY_INTEGRATION.md` (INR-only, HMAC verification, idempotent webhooks).
12. **Playwright specs.** `playwright` is a devDependency but no specs exist. The HTTP e2e script covers booklet flows; general e2e (checkout, auth, exam) is manual.
13. **`docs/ADC_HANDOFF.md` is stale (2026-10-15).** Superseded by the root documentation pack; kept for history — consider deleting or archiving.
14. **Business identity placeholders.** Footer/contact settings (address, +65 phone) come from DB settings; review for India-only product positioning. (Business decision, not code.)
15. **Admin RBAC granularity.** Only `ADMIN | USER` roles are enforced; finer roles are absent by design for now.

## Constraints that must hold (repeat of AGENTS.md, because they bite)

- **INR-only (₹).** Never reintroduce SGD/USD display, storage, or rails without explicit authorization; legacy rows keep explicit legacy labels. The `test:inr` Suite 8 guard fails the suite on new SGD strings.
- **Never bypass** authentication, entitlement checks (`decideAccess`/`hasBookletEntitlement`), licensing confirmation, or clinical-review gates — including "just for testing" (use `scripts/dev-booklet-fixture.ts` instead).
- **No destructive DB operations**, no migrations without approval, no production deploys without approval.

## Dependencies / environment requirements

- Node 22, embedded Postgres (or Docker Postgres/MailHog), `DATABASE_URL(+_UNPOOLED)` pointing at the intended DB, `NEXTAUTH_URL`/`NEXTAUTH_SECRET`, `ADMIN_EMAIL`/`ADMIN_PASSWORD` for bootstrap, `GEMINI_API_KEY` or Vertex vars only for booklet conversion (keep **empty** when running the HTTP e2e suite — its 503 test requires "no credentials"), `R2_*` optional, `SMTP_*` or Gmail settings for email.
- Full environment table: `TESTING_AND_DEPLOYMENT.md`.

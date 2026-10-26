# TESTING_AND_DEPLOYMENT.md — ADC Exam Prep

All commands verified in this workspace on 2026-10-26/27 unless marked otherwise. **Never commit or print secret values** — variable names only.

## 1. Local development setup

```bash
npm install                                  # plain install (no --legacy-peer-deps needed)
npm run db:local                             # embedded Postgres on 127.0.0.1:55434, db adc_local (data in .localdb/, gitignored)
cp .env.example .env                         # configure (table below)
npx prisma generate
npx prisma db push                           # or npm run db:migrate for versioned migrations
npm run db:seed                              # vendors, exams, ₹1,499 bundle, admin user
npm run dev -- -p 3040                       # http://localhost:3040
```

- `npm run db:local` keeps running in the foreground (Ctrl+C stops it); the dev server needs it up first.
- Legacy alternative still in repo: `docker-compose.yml` (Postgres :55432 + MailHog :8025). The current working setup uses the **embedded** Postgres.
- Admin bootstrap: `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` are used by the seed to create the admin account (existing admin passwords are never changed by seeds).
- Most runtime config (Stripe, email transport, OAuth, company info) lives in **Admin → Settings** (AES-256-GCM-encrypted `Setting` table), not in env.

### Environment variables (names only — values in `.env`, never committed)

| Variable | Purpose |
|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | Postgres connection(s). Local dev: `postgresql://postgres:postgres@127.0.0.1:55434/adc_local`. **Double-check before any migrate/deploy** (past incident: deploy reached Neon production) |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `APP_URL` | Auth + absolute URLs |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Bootstrap admin (seed) |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASSWORD` `SMTP_FROM` | Email (or configure Gmail OAuth/service-account in Admin → Settings) |
| `GEMINI_API_KEY` or `GOOGLE_CLOUD_PROJECT` + `GOOGLE_CLOUD_LOCATION` + `GOOGLE_APPLICATION_CREDENTIALS` | Booklet PDF conversion (keep **unset** for the HTTP e2e suite — see §3) |
| `R2_ACCOUNT_ID` `R2_BUCKET` `R2_ACCESS_KEY_ID` `R2_SECRET_ACCESS_KEY` `R2_PUBLIC_URL` | Cloudflare R2 private figure storage (optional; local disk default) |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Analytics (optional) |
| `PAYPAL_*`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `NEXT_PUBLIC_TEST_PAYMENTS` | Legacy rails (disabled at checkout methods level) |
| `TEST_DATABASE_URL`, `BASE_URL` | Test-suite overrides (scripts only) |

## 2. Verification commands

| Command | What it verifies | Last result |
|---|---|---|
| `npm run typecheck` | TypeScript, whole repo | **PASS** 2026-10-27 (after INR changes) |
| `npm run lint` | ESLint | 0 errors, ~24 pre-existing warnings — last run before INR edits; re-run recommended |
| `npm run build` | Production build (prisma generate + webpack) | **PASS** 2026-10-26; re-run recommended after INR edits |
| `npm run test:scoring` | Exam scoring unit tests | 25/25 (progress.md §23) |
| `npm run test:booklet` | Booklet access/content unit tests | **27/27** 2026-10-27 |
| `BASE_URL=… npx tsx scripts/smoke-core-routes.ts` | Authenticated 17-route smoke (uses seeded admin) | **17/17** 2026-10-27 |
| `npx tsx scripts/test-otp-rate-limit.ts` | OTP brute-force cap + per-email request cap | **3/3** 2026-10-27 |
| `npx tsx scripts/test-inr-migration.ts` | INR formatting, checkout-methods denomination, non-INR provider rejection, webhook guard, SGD source-scan guard, **schema↔migrations drift (Suite 9)**, **per-currency revenue honesty (Suite 10)**, **server-action form guard (Suite 11)**, **live-DB↔schema drift (Suite 12)** | **26/26** 2026-10-27 (run with local `DATABASE_URL`; needs seeded bundle) |
| Integration (below) | Booklet workflow against a throwaway DB | **38/38** 2026-10-27 |
| HTTP e2e (below) | Full student/admin booklet flows over HTTP | **21/21** 2026-10-27 |
| `npm run check:links` | Internal link crawl | 56/56 (progress.md §22) |

### Integration suite (throwaway DB)

```bash
# one-time: create the local test DB (embedded instance must be running)
node -e "const{Client}=require('pg');(async()=>{const c=new Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:55434/postgres'});await c.connect();await c.query('CREATE DATABASE booklet_test').catch(e=>console.log(e.message));await c.end();})()"
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55434/booklet_test" npx prisma db push --skip-generate
TEST_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55434/booklet_test" npx tsx scripts/test-booklet-integration.ts
```

The script refuses non-local URLs. Gemini is mocked; nothing is written outside `booklet_test`.

### HTTP e2e suite (needs a second dev server — see warning)

```bash
# 1) Stop the main dev server first (Next 16 allows only one dev server per directory,
#    and two servers corrupt .next/dev/types).
# 2) Start a test server on 3041 against the throwaway DB with Gemini vars EMPTIED
#    (the suite asserts a 503 "not configured" path; .env may carry Vertex vars):
GEMINI_API_KEY= GOOGLE_CLOUD_PROJECT= GOOGLE_CLOUD_LOCATION= GOOGLE_APPLICATION_CREDENTIALS= \
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55434/booklet_test" \
DATABASE_URL_UNPOOLED="postgresql://postgres:postgres@127.0.0.1:55434/booklet_test" \
  npx next dev -p 3041 --webpack
# 3) Run it:
TEST_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55434/booklet_test" \
BASE_URL="http://127.0.0.1:3041" npx tsx scripts/test-booklet-http.ts
# 4) Stop 3041 and restart the normal dev server on 3040.
```

The suite creates its own admin/student users in `booklet_test` (credentials are random per run; never printed).

### Authenticated route smoke test

```bash
BASE_URL=http://localhost:3040 npx tsx scripts/smoke-core-routes.ts
```

Logs in with the seeded admin (`ADMIN_EMAIL`/`ADMIN_PASSWORD` from `.env`, values never printed) and asserts 200 on 17 major public/user/admin routes — including the pages that broke in the `providerStatus` incident. Current: **17/17 OK**.

> **Env precedence hazard:** Next.js gives `.env.local` precedence over `.env`. Both files must agree on `DATABASE_URL` for local development — a stale `.env.local` once pointed local dev at the shared Neon production DB. The Suite 12 drift guard catches this.

## 3. Manual / browser testing

- Dev server on 3040; the study area needs a signed-in account. `npx tsx scripts/dev-booklet-fixture.ts` creates a clearly-labeled synthetic **published** booklet (4 free-preview chapters, all six modes, MCQs) in the **local** DB for student-experience testing.
- The real eTG booklet (`tg-oral-dental`) is `DRAFT`/unlicensed/unreviewed — visible to admins only as an admin preview. Do not publish without completing licensing + clinical review (see `FEATURE_STATUS.md`).
- Email: MailHog via docker compose (:8025) or the configured SMTP.

## 4. Deployment

- **Platform:** Vercel (production: `https://adc-exam-prep-app.vercel.app/`), Neon Postgres. Self-host Docker also works (multi-stage `Dockerfile` runs `prisma migrate deploy` at container start).
- **Migrations:** use `npm run db:deploy` (or the Docker entrypoint) **after** verifying the target URL. `prisma migrate deploy` reached Neon production once because the local URL override was missing — treat this as the top deployment hazard (KNOWN_ISSUES #6).
- **Do not** deploy without explicit user approval; do not change payment-provider settings from tooling.
- Build: `npm run build` (webpack). Vercel runs the same via the package script.

## 5. Troubleshooting (verified cases)

| Symptom | Cause / fix |
|---|---|
| Every page 500s; dev log shows `The 'X' class does not exist` near `globals.css` | A `@apply`/class references a non-existent Tailwind shade (e.g. `brand-400`). Complete the palette in `tailwind.config.ts`. |
| `⨯ Another next dev server is already running` | Next 16 allows one dev server per directory. Kill the old PID (`netstat -aon | findstr :PORT` → `taskkill //PID <pid> //F`) or use the test port 3041 only after stopping 3040. |
| Typecheck errors inside `.next/dev/types/*` | Corrupted generated types (two servers raced). Stop servers, delete `.next/dev/types`, restart one server. |
| React 19 hydration mismatch mentioning `data-gr-*` on `<body>` | Browser extension (Grammarly). Already handled via `suppressHydrationWarning` on `<body>` — don't remove it. |
| Console warning "script tag while rendering React component" at layout | `next/script` with inline children; the theme-init uses a raw inline script — keep it that way. |
| HTTP suite: "conversion … 503" test fails with 200 | Vertex/Gemini env vars are set. Restart the test server with them emptied (see §2) — never edit `.env` for this. |
| `Multiple lockfiles detected` warning at dev/build | Parent-directory `package-lock.json` (user home). Harmless; optionally set `turbopack.root`. |
| Test failing on regex across "Free Preview · 1 Chapter Free" | SSR inserts `<!-- -->` between JSX text and `{expr}` — assert on single template-literal text nodes (already fixed in source). |
| Windows CRLF | Repo has mixed line endings; expect `LF will be replaced by CRLF` warnings and use line-ending-tolerant replacements when scripting edits. |

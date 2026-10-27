# DEPLOYMENT_CHECKLIST.md — commit `6568a24`

Approval-gated production deployment runbook. **Nothing in this file has been executed against production.** Read with `TESTING_AND_DEPLOYMENT.md` §4 and `HANDOFF.md`.

## Pre-flight facts (verified locally, 2026-10-27)

- HEAD = `6568a24`, pushed to `origin/main`, clean tree. `prisma validate` ✓, typecheck ✓, build ✓, lint 0 errors.
- Tests on this exact tree: `test:inr` 28/28 · `test:otp` 3/3 · `test:booklet` 27/27 · booklet HTTP e2e 22/22 · route smoke 17/17.
- Schema requires **both** `DATABASE_URL` (pooled, runtime) and `DATABASE_URL_UNPOOLED` (direct, migrations) on the deployment platform (`prisma/schema.prisma` datasource `directUrl`).
- Neon endpoints (identity only; credentials are deliberately no longer stored on disk): `ep-raspy-cake-a1d2189f-pooler…` (pooled) / `ep-raspy-cake-a1d2189f…` (direct), database `neondb`.
- Migration `20261021000000_add_study_booklets` is believed **already applied** to Neon (past incident: an unguarded `migrate deploy` applied it). `20261022000000_add_cashfree` (`Order.providerStatus` + payment lifecycle columns + `PaymentStateChange` table) is **pending verification** — production evidence (runtime "column does not exist" errors) says it is **not** applied.
- The migration is additive (ADD COLUMN IF NOT EXISTS, new table, enum ADD VALUE) — it preserves all financial records; `Order.currency` default becomes INR for new rows only. `ALTER TYPE … ADD VALUE` is safe on Neon's PostgreSQL 15/16 because the new values are not used inside the migration transaction.
- **Docker hazard:** the Dockerfile auto-runs `migrate deploy` + seed at container start — never point a Docker container at a database you have not approved migrating.

## Phase 0 — read-only pre-checks (safe to run anytime)

```bash
# Option A: paste the Neon direct URL (from Vercel env or Neon console) when prompted — read-only queries only:
node -e "const{Client}=require('pg');const c=new Client({connectionString:process.env.NEON_DIRECT_URL,ssl:{rejectUnauthorized:false}});(async()=>{await c.connect();console.log('migrations:',(await c.query('SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC NULLS LAST LIMIT 5')).rows);console.log('cashfree applied:',(await c.query(\"SELECT count(*) FROM _prisma_migrations WHERE migration_name LIKE '%cashfree%'\")).rows[0].count);console.log('providerStatus column:',(await c.query(\"SELECT column_name FROM information_schema.columns WHERE table_name='Order' AND column_name='providerStatus'\")).rows);console.log('PAID orders:',(await c.query(\"SELECT count(*) FROM \\\"Order\\\" WHERE status='PAID'\")).rows[0].count);await c.end();})()"
```

(Replace `NEON_DIRECT_URL` accordingly, or run the same statements in the Neon SQL editor.)

- Neon console: confirm backup/PITR retention; optionally create a Neon **branch** as an instant pre-migration snapshot.

### Phase 1 pre-check — migration SQL review (verified from the local file `prisma/migrations/20261022000000_add_cashfree/migration.sql`)

| Statement | Impact | Reversibility |
|---|---|---|
| `ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS "STRIPE" / "CASHFREE"` | Adds two enum values; zero row changes. Safe on Neon PG 15/16 (values unused inside the migration transaction). | Not directly reversible; harmless to old code (values are only used by new code). |
| `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS disputeStatus/providerExpiresAt/providerSessionId/providerStatus/reconciledAt` | All nullable, no defaults → metadata-only, no table rewrite, milliseconds even under traffic. Existing rows read NULL. | Forward-only; columns are harmless to the previous code version, so code rollback does not require column removal. |
| `ALTER COLUMN "currency" SET DEFAULT 'INR'` | Affects NEW rows only; existing rows unchanged. | Forward-only. |
| `CREATE TABLE "PaymentStateChange" + index + FK (ON DELETE CASCADE)` | New table only; no existing table or row is modified. | **Not idempotent** — re-running the migration fails if the table exists; do not manually create it beforehand. |

- **Data preservation:** the file contains no UPDATE, DELETE, TRUNCATE, or DROP — purely additive; all financial records are untouched.
- **Rollback limitations:** this repo keeps forward-only migrations (no down-migrations). The rollback for a bad deployment is **code-level** (promote the previous Vercel deployment — the added columns/enum values/table are ignored by the previous code version), NOT schema reversal.
- **Blocking dependency:** this migration must be applied BEFORE promoting the `6568a24` deployment; the pre-`d1d8310` production code is compatible with the new schema either way, so there is no ordering hazard with the currently promoted build.

## Phase 1 — database migration (requires explicit approval)

```bash
# Run from the repo root. The deploy is additive and preserves all data.
DATABASE_URL="<pooled-url>" DATABASE_URL_UNPOOLED="<direct-url>" npx prisma migrate deploy
DATABASE_URL="<pooled-url>" DATABASE_URL_UNPOOLED="<direct-url>" npx prisma migrate status   # must end: "Database schema is up to date"
```

Post-migration verification:

```sql
SELECT column_name FROM information_schema.columns WHERE table_name='Order' AND column_name='providerStatus';  -- must return a row
SELECT count(*) FROM "Order" WHERE status='PAID';   -- must equal the Phase 0 count (no data loss)
SELECT count(*) FROM "PaymentStateChange";          -- 0+ rows, table exists
```

## Phase 2 — Vercel deployment

1. Vercel → Project → Settings → Environment Variables: verify `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direct), `NEXTAUTH_URL` (= production URL), `NEXTAUTH_SECRET`, `SMTP_*`/Gmail settings (or email configured via admin Settings), `ADMIN_EMAIL`/`ADMIN_PASSWORD` only if bootstrap needed. `GEMINI_*` may stay unset (booklet conversion returns a graceful 503). Sentry/Plausible optional.
2. Deploy commit `6568a24` (dashboard → latest deployment → Promote, or `vercel --prod`).
3. **Order matters:** apply Phase 1 before promoting a deployment that contains the booklet/orders code — otherwise admin orders/invoices will 500 on the missing columns.

## Phase 3 — post-deploy smoke (production)

```bash
BASE_URL=https://adc-exam-prep-app.vercel.app npx tsx scripts/smoke-core-routes.ts
```

(Uses the production admin credentials from `.env` — in-memory only, never printed. Expected: 17/17 routes OK, including `/admin-dashboard/orders`, `/admin-dashboard/invoices`.)

Additional manual checks: invoice pages display ₹; tax/revenue reports render without SGD-equivalent rows; teaser OTP flow sends email and rate-limits after 3 requests/hour (production limits); a paid account can open booklet study pages.

## Rollback

- Code: Vercel → Promote the previous deployment (pre-`6568a24`).
- Database: the migration is additive — rolling back code does not require reversing it. Do **not** drop columns; if a rollback is needed, promote the old deployment and leave the schema in place (it is backward-compatible).

## Known deployment risks

| Risk | Severity | Mitigation |
|---|---|---|
| Vercel auto-deploy ran `d1d8310`/`6568a24` before the Neon migration | High (admin orders/invoices 500 in production) | Check Vercel deployments now; if auto-deployed, run Phase 1 immediately or roll back the deployment |
| Migration state on Neon unverified (credentials masked on disk) | Medium | Run Phase 0 to establish facts before any change |
| `ALTER TYPE ADD VALUE` behavior | Low | Safe on Neon's PostgreSQL 15/16; values unused inside the migration |
| In-memory OTP/IP rate limiter per serverless instance | Low | Documented; DB-backed per-email caps cover the cross-instance case |
| Docker auto-migrate + seed at container start | Medium (if Docker path used) | Point containers only at approved databases |

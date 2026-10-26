<div align="center">

# ADC Exam Prep

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://react.dev)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2d3748?style=flat-square&logo=prisma)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org)

**An independent workspace for ADC (Australian Dental Council) exam preparation.**

[Local demo](http://localhost:3040) · [Mock tests](http://localhost:3040/practice-exams) · [Study library](http://localhost:3040/user-dashboard/study)

> This is a neutral, independent product identity. It is not an official Australian Dental Council website and does not imply ADC endorsement or affiliation.

> **Currency: INR only.** This is an India-only product. All prices, invoices, and payments are denominated in Indian Rupees (₹) and processed via Stripe. Legacy pre-migration records keep their original currency labels.

</div>

AI coding agents: **read [`HANDOFF.md`](HANDOFF.md) and [`AGENTS.md`](AGENTS.md) before making any changes.**

## Overview

A full-stack exam-preparation platform for overseas dental practitioners: clinical-scenario mock tests with a timed exam engine, per-domain performance analytics, a booklet study library (Easy Notes, summaries, key concepts, tables, flowcharts, flashcards, MCQs, and a PDF source inspector), Stripe INR checkout with server-authoritative entitlements, GST invoicing, and a complete admin dashboard.

## Documentation pack

| File | Purpose |
|---|---|
| [`HANDOFF.md`](HANDOFF.md) | **Start here** — current state, next steps, constraints |
| [`AGENTS.md`](AGENTS.md) | Mandatory rules for every AI agent (incl. currency policy §1.1) |
| [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md) | Architecture, stack, modules, integrations, data flow |
| [`FEATURE_STATUS.md`](FEATURE_STATUS.md) | Feature matrix with verification evidence |
| [`IMPLEMENTATION_HISTORY.md`](IMPLEMENTATION_HISTORY.md) | Completed changes, fixes, test results |
| [`KNOWN_ISSUES_AND_TODO.md`](KNOWN_ISSUES_AND_TODO.md) | Bugs, tech debt, priorities |
| [`DATABASE_AND_API.md`](DATABASE_AND_API.md) | Models, relations, API routes, access control |
| [`TESTING_AND_DEPLOYMENT.md`](TESTING_AND_DEPLOYMENT.md) | Test setups, commands, deployment, troubleshooting |
| [`CLAUDE.md`](CLAUDE.md) | Claude-specific instructions (references AGENTS.md) |
| [`progress.md`](progress.md) | Detailed session-by-session work log |

## Quick start (local development)

```bash
npm install                      # regular install; legacy-peer-deps not required
npm run db:local                 # starts embedded Postgres on 127.0.0.1:55434 (data in .localdb/)
cp .env.example .env             # then set DATABASE_URL to postgresql://postgres:postgres@127.0.0.1:55434/adc_local
npx prisma generate && npx prisma db push
npm run db:seed                  # vendors, exams, bundles (₹1,499 bundle), admin user
npm run dev -- -p 3040           # http://localhost:3040
```

Optional demo fixture for the study area (synthetic content, clearly labeled):

```bash
npx tsx scripts/dev-booklet-fixture.ts
```

Admin credentials are set via `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` (values are never printed by tooling; see `TESTING_AND_DEPLOYMENT.md`). Most runtime configuration (Stripe keys, email transport, OAuth, company info) is managed in **Admin → Settings** and stored AES-256-GCM encrypted in the `Setting` table.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev -- -p 3040` | Development server |
| `npm run build` | Prisma generate + production build (webpack) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test:scoring` | Exam scoring unit tests |
| `npm run test:booklet` | Booklet access/content unit tests |
| `npx tsx scripts/test-inr-migration.ts` | INR currency acceptance tests incl. SGD regression guard (see `TESTING_AND_DEPLOYMENT.md`) |
| `npm run db:local` | Embedded local Postgres |
| `npm run db:migrate` / `db:deploy` / `db:seed` / `db:studio` | Prisma workflows |
| `npm run check:links` | Internal link checker |

Full test matrix, isolated test databases, and deployment workflow: [`TESTING_AND_DEPLOYMENT.md`](TESTING_AND_DEPLOYMENT.md).

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS (brand teal `#0f766e`) · PostgreSQL (Neon in production, embedded Postgres locally) · Prisma · Auth.js/NextAuth (credentials + email OTP + OAuth) · Stripe (INR) · Nodemailer · Gemini (booklet conversion) · Cloudflare R2 / local private storage · pdf-lib/pdf-parse/pdfjs · Sentry.

## Contributing

Small, verified diffs; run `npm run typecheck`, `npm run lint`, and the relevant test scripts before handing off. Keep the app INR-only (₹) and preserve authentication, entitlement, licensing, and clinical-review safeguards. No official ADC affiliation or endorsement is implied anywhere in the product.

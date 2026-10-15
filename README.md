<div align="center">

# ADC Exam Prep Demo

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://react.dev)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2d3748?style=flat-square&logo=prisma)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org)

**An independent workspace for ADC exam preparation.**

[Local demo](http://localhost:3040) · [Mock tests](http://localhost:3040/practice-exams)

> This is a neutral, independent demo identity. It is not an official Australian Dental Council website and does not imply ADC endorsement or affiliation.

</div>

ADC Exam Prep Demo is an incremental rebrand of the existing exam platform. The demo focuses the public experience on approved dental clinical-scenario mock tests, timed or practice attempts, result review, and learner progress. Existing authentication, database, admin, payment, email, and integration code is retained for compatibility but is not required for the initial demo.

## Table of Contents

- [Overview](#overview)
- [Screenshot](#screenshot)
- [Features](#features)
- [ADC Demo Scope](#adc-demo-scope)
- [Demo](#demo)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running Locally](#running-locally)
- [Scripts](#scripts)
- [Usage](#usage)
- [Database](#database)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Known Issues](#known-issues)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Overview

The ADC demo provides a focused preparation workflow while preserving the existing routes and data model. Content is expected to come from the supplied source material and must be manually reviewed before import or publication. The demo does not generate questions, provide official exam advice, or promise exam outcomes.

**Current Status:** The available public shell and ADC branding have been cleaned up. Full local verification is currently blocked because this workspace export is missing the shared `src/components` and `src/lib` trees and most student-facing route files.

## Screenshot

![Screenshot](screenshot.png)

## Features

- **Focused public home:** ADC terminology, independent-demo disclosure, and no vendor, voucher, testimonial, or fabricated-statistic marketing.
- **Mock-test workflow:** Browse available preparation sets, complete supported practice/timed attempts, and review results where the existing routes are present.
- **Manual content review:** Admins can review supplied question wording, options, answer keys, references, and images before publishing.
- **Existing platform services:** Authentication, database, payments, email, and admin routes remain available for compatibility and are intentionally not represented as required demo features.

## ADC Demo Scope

Only reviewed dental clinical-scenario MCQs from the supplied source document should be imported. Do not bulk-import the legacy certification catalog until the import format, source fidelity, answer keys, references, and image coverage have been verified manually.

## Demo

- **Local demo:** [http://localhost:3040](http://localhost:3040)
- **Mock tests:** [http://localhost:3040/practice-exams](http://localhost:3040/practice-exams)

## Tech Stack

| Area | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS |
| Backend | Node.js, Next.js API Routes |
| Database | PostgreSQL, Prisma ORM |
| Authentication | Auth.js (NextAuth v5 beta), Argon2 |
| Payments | Stripe, PayPal, HitPay, PayNow |
| AI / Integrations | Claude Agent SDK, Firecrawl API, Nodemailer, PDF-lib |
| Deployment | Docker, Coolify-ready |

## Architecture

The application uses a monolithic architecture built entirely on the Next.js App Router. It leverages Server Actions for form submissions and Next.js Route Handlers for webhooks, external integrations, and cron workers. Data is persisted in PostgreSQL using Prisma.

```mermaid
flowchart TD
    User[User / Visitor] --> NextUI[Next.js Frontend]
    Admin[Administrator] --> NextUI
    NextUI --> RouteHandlers[Next.js API & Server Actions]
    RouteHandlers --> Prisma[Prisma ORM]
    Prisma --> Postgres[(PostgreSQL Database)]
    RouteHandlers --> Payments[Stripe / PayPal / HitPay]
    RouteHandlers --> Email[Nodemailer / Gmail OAuth]
    RouteHandlers --> AI[Claude / Firecrawl API]
    Cron[Cron Workers] --> RouteHandlers
```

## Repository Structure

- `prisma/`: Database schema, migrations, and seed scripts.
- `src/app/`: Next.js App Router pages (public marketing, checkout, exam runner, user dashboard, admin dashboard, API routes).
- `src/components/`: Shared UI components for frontend and dense admin data tables.
- `src/lib/`: Core business logic (analytics, invoice generation, payments, AI integration, coupons, settings, etc.).
- `scripts/`: Bulk question seeding, content generation, and utility scripts.
- `.claude/`: Project-specific Claude AI agent and skill instructions.
- `public/`: Static assets and logos.

## Prerequisites

- **Node.js**: v22+
- **Docker**: For running a local PostgreSQL database and MailHog.
- **Database**: PostgreSQL 16+

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/alfredang/ai-exams.git
   cd ai-exams
   ```

2. Install dependencies (requires `--legacy-peer-deps` due to some React 19 incompatibilities):
   ```bash
   npm install --legacy-peer-deps
   ```

3. Copy the environment configuration:
   ```bash
   cp .env.example .env
   ```

## Configuration

1. Start the local database and mail server using Docker Compose:
   ```bash
   docker compose up -d postgres mailhog
   ```
   *(Postgres is exposed on port 55432, MailHog on port 8025)*

2. Open the `.env` file and configure the `DATABASE_URL` to point to the local instance (e.g., `postgresql://aiexams:aiexams@127.0.0.1:55432/aiexams?schema=public` — note the host port is **55432**, not the default 5432).

3. Note that most application configuration (Stripe keys, PayPal keys, Auth providers, SEO, Company Info, Email credentials) is managed **at runtime via the Admin Dashboard Settings** rather than environment variables.

## Running Locally

1. Apply database migrations:
   ```bash
   npx prisma db push
   # Or npm run db:migrate if managing dev migrations
   ```

2. Seed the database with the initial admin user and existing records (do not import the legacy catalog into the ADC demo):
   ```bash
   npm run db:seed
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev -- -p 3040 -H 127.0.0.1
   ```

4. The application will be available at `http://localhost:3040`.

## Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Generates the Prisma client and builds the Next.js application for production.
- `npm run start`: Starts the Next.js production server.
- `npm run typecheck`: Runs TypeScript compiler check without emitting files. (`npm run lint` is currently broken — the installed Next.js version removed `next lint`; rely on typecheck + build.)
- `npm run db:migrate`: Creates and applies development database migrations.
- `npm run db:deploy`: Applies pending database migrations (for production).
- `npm run db:seed`: Seeds the database with default vendors, exams, bundles, and admin users.
- `npm run db:studio`: Opens Prisma Studio to visually inspect the database.
- `npm run generate:exam`: Existing CLI question-generation utility retained for compatibility; not part of the ADC demo content workflow.

## Usage

### User Flow
1. Visit the homepage and browse the available `/practice-exams` mock tests.
2. Sign in when required, start a supported practice or timed attempt, and submit it.
3. Review the result and return to `/user-dashboard` to revisit supported attempts and progress.

### Admin Flow
1. Sign in using the seeded admin credentials.
2. Navigate to `/admin-dashboard` to view KPIs and manage the catalog.
3. Go to `/admin-dashboard/questions` and `/admin-dashboard/exams/[id]/author` to review supplied content manually before publishing.
4. Keep payment, voucher, and AI integrations disabled or sandboxed for demo testing unless explicitly needed for a separate workflow.

## Database

The project uses PostgreSQL with Prisma ORM.

- **Schema:** Defined in `prisma/schema.prisma`.
- **Seeding:** The `prisma/seed.ts` file populates the database with initial vendor data, multi-variant exam bundles, and admin user credentials.
- **Migration:** Run `npm run db:migrate` or `npx prisma db push` to apply schema changes.

## Testing

There is no automated test runner configured in the repository (e.g., Jest/Cypress). 

### Manual Testing
- **Local Dev Server:** Verify functionality manually on the local dev server.
- **E2E Smoke:** Use Playwright MCP for end-to-end smoke testing (homepage, mock-test catalogue, login, attempt, result, and admin review).
- **Email:** Use MailHog at `http://127.0.0.1:8025` to intercept outbound emails.
- **Payments:** No live payments are required for the ADC demo. Use only a clearly labelled sandbox if commerce is explicitly demonstrated.

## Deployment

The application is built for deployment on platforms like Vercel or self-hosted Docker environments (Coolify-ready).

### Docker Deployment
The repository includes a multi-stage `Dockerfile` tailored for Next.js standalone output.

1. Ensure environment variables (`NEXTAUTH_URL`, `DATABASE_URL`, `WORKER_SHARED_SECRET`, etc.) are configured in the deployment platform.
2. Build and deploy the Docker image. The container will automatically run `prisma migrate deploy` before starting the server.

## Security

> [!WARNING]
> Existing administrator passwords are never changed by database seeds. Set the
> required password environment variables only when bootstrapping a new account.

- Ensure `NEXTAUTH_SECRET` and `WORKER_SHARED_SECRET` are randomly generated and securely stored.
- Most sensitive keys (Stripe, HitPay, OAuth Client Secrets) are stored encrypted in the `Setting` database table and decrypted at runtime.
- Next.js Route handlers acting as webhooks verify request signatures (e.g., Stripe, HitPay) before processing logic.

## Troubleshooting

- **Database Connection Error:** Ensure Docker is running and the `DATABASE_URL` port matches the exposed port (`55432` by default).
- **Next.js Hydration Errors:** Occur occasionally during development; restart the dev server or verify HTML markup nesting.
- **Legacy AI routes:** AI integrations remain in the backend for compatibility but are intentionally hidden from the ADC demo interface.
- **NPM Install Errors:** Ensure you pass the `--legacy-peer-deps` flag to `npm install` to avoid conflicts with React 19.

## Known Issues

- The runner UI currently only supports `SINGLE`, `MULTI`, and `TRUE_FALSE` questions, despite the database schema supporting `ORDERING` and `HOTSPOT`.
- Formal compliance certifications (e.g., GDPR reporting features) are limited to data export requests.
- Role-based Access Control (RBAC) granular roles (Finance, Support, Content) are defined but mostly require strict `ADMIN` enforcement at the API proxy layer.

## Roadmap

- [ ] Define security and privacy acceptance gates before production use.
- [ ] Add automated test coverage for auth, payments, attempts, and admin mutations.
- [ ] Implement front-end support for `ORDERING` and `HOTSPOT` question types.
- [ ] Refine proxy permissions to utilize non-admin granular RBAC roles (`FINANCE`, `SUPPORT`, `CONTENT`).

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

Please ensure your code passes `npm run typecheck` and `npm run build` before opening a pull request.

## Branding

The current ADC identity is a temporary, neutral demo brand. Replace it with customer-approved naming and assets when supplied. No official ADC affiliation or endorsement is implied.

## License

© [Your Organization / Company Name]. All rights reserved.

# Daily Planner

Production-focused full-stack Daily Planner built with Next.js App Router, Prisma, PostgreSQL, and TypeScript.

## Features

- Auth: register/login/logout, secure password hashing (`bcryptjs`), HTTP-only JWT session cookie.
- Daily entries by date with auto-create behavior.
- Scored components: tasks, grow, habits, exercise, gratitude, water.
- Daily Score (0-100%) with NA component exclusion + weight re-normalization.
- Score settings with guardrails, presets, historical versions by `effectiveFrom`, and 7-day cooldown.
- For Tomorrow auto-move:
  - Cron endpoint: `POST /api/jobs/for-tomorrow`
  - Fallback on first daily page load for selected date.
  - Idempotent and deduplicates by exact task title match.
- Dashboard: weekly/monthly score trend, XP/levels, badges/challenges payloads.
- Rate limiting on sensitive/toggle endpoints.

## Stack

- Frontend: Next.js 14, React, TailwindCSS, React Query, React Hook Form + Zod
- Backend/API: Next.js Route Handlers, Zod validation
- DB/ORM: PostgreSQL + Prisma
- Tests: Vitest

## Setup

0. Use Node 20 (required):

```bash
nvm use
node -v
```

If your shell does not auto-load `nvm`, run:

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH"
```

1. Install deps:

```bash
npm install
```

2. Start Postgres (optional with Docker):

```bash
docker compose up -d
```

3. Configure env:

```bash
cp .env.example .env
```

4. Generate Prisma client + run migrations + seed:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Health check:

```bash
npm run doctor
```

5. Start app:

```bash
npm run dev
```

App runs on [http://localhost:3000](http://localhost:3000).

## Stable Local Bootstrap (Recommended)

Use one deterministic command:

```bash
npm run local:up
```

This command does:
1. Node version check
2. PostgreSQL reachability/start check
3. Prisma generate + migrate + seed
4. Runtime doctor check
5. Starts app on [http://127.0.0.1:3010](http://127.0.0.1:3010)

If local DB drift happens and you want a full clean reset:

```bash
npm run local:reset
```

For a fully stable local run (recommended if you see blank UI/CSS issues), use:

```bash
npm run start
```

Important: run only one Next process at a time (either `dev` or `start`, not both).

If migrations report drift in local development, run:

```bash
npx prisma migrate reset --force
```

This resets local development data and re-seeds demo data.

## Demo seed account

- Email: `demo@dailyplanner.app`
- Password: `DemoPass123!`

## Environment variables

- `DATABASE_URL`: Postgres connection string
- `AUTH_SECRET`: JWT signing secret
- `CRON_SECRET`: secret header value for cron endpoint
- `NODE_ENV`: `development`/`production`
- `ENABLE_FORGOT_PASSWORD`: `false` by default in v2 (set `true` to enable forgot/reset password routes)

## Health endpoint

- `GET /api/health` returns:
  - app runtime status
  - DB connectivity status (`up`/`down`)
  - node/env metadata for debugging

## API Contract (minimum implemented)

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `GET /api/auth/me`

### Core daily
- `GET /api/daily-entry?date=YYYY-MM-DD`
- `POST /api/daily-entry/upsert`
- `POST /api/tasks/create`
- `PATCH /api/tasks/update`
- `POST /api/tasks/move-to-tomorrow`
- `POST /api/tasks/carryover` (`add_today` | `reschedule` | `dismiss`)
- `POST /api/habits/create`
- `PATCH /api/habits/update`
- `POST /api/habit-logs/toggle`
- `POST /api/exercise/log`
- `POST /api/gratitude/add`
- `DELETE /api/gratitude/delete`
- `POST /api/water/update`

### Dashboard + scoring
- `GET /api/dashboard?range=week|month`
- `GET /api/score-settings`
- `POST /api/score-settings/update`
- `POST /api/jobs/for-tomorrow` (cron; requires `x-cron-token`)

### Notifications
- `GET /api/notifications?limit=15`
- `POST /api/notifications/mark-read`
- `POST /api/notifications/dismiss`
- `POST /api/notifications/action`

## Scoring Rules

Implemented in pure module: `src/lib/score/engine.ts`.

- Tasks: `completed/planned`, NA if planned is 0
- Grow: 0 empty, 0.5 for 1..79 chars, 1 for >=80
- Habits: `done/expected`, NA if expected is 0
- Exercise: 0, 0.3 (1..9), 0.7 (10..29), 1 (>=30)
- Grateful: 0 for none, 0.5 for one, 1 for >=2
- Water: `consumed/target`, capped at 1
- NA handling: exclude NA components, re-normalize active weights to 100
- Display rounding: half-up integer percent

## Required tests

Run:

```bash
npm test
```

Includes unit tests for:
- Weight guardrails
- NA handling + re-normalization
- Water fallback/capping
- Exercise boundaries
- Grow thresholds
- Rounding

## Deployment notes

- Recommended: Vercel + managed Postgres (Neon/Supabase/Railway).
- Ensure `AUTH_SECRET` and `CRON_SECRET` are set in environment.
- Run `prisma migrate deploy` on release.
- Trigger `POST /api/jobs/for-tomorrow` daily (00:05 per timezone buckets if using external scheduler).

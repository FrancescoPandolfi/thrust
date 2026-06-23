# Thrust

Personal portfolio tracker built with Next.js 16, Drizzle ORM, and Neon Postgres. Tracks ETF and crypto positions with live Yahoo Finance quotes, P/L calculations, cash balances, and automated daily return snapshots.

## Stack

- **Next.js 16** (App Router) + React 19
- **Tailwind CSS v4** (dark-only UI)
- **Drizzle ORM** + **Neon Postgres** (`@neondatabase/serverless`)
- **yahoo-finance2** for market data
- **@tremor/react** for charts and KPI cards
- **iron-session** + **bcryptjs** for password auth

## Local development

1. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Fill in:

   | Variable | Description |
   |----------|-------------|
   | `DATABASE_URL` | Neon Postgres connection string |
   | `APP_PASSWORD` | Login password (plain text or bcrypt hash) |
   | `SESSION_SECRET` | Random string, 32+ characters |
   | `CRON_SECRET` | Bearer token for cron snapshot endpoint |

3. Push the database schema:

   ```bash
   npm run db:push
   ```

4. Seed initial positions:

   ```bash
   npm run db:seed
   ```

5. Start the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push the code to GitHub.
2. Import the project in [Vercel](https://vercel.com/new).
3. Create a **Neon Postgres** database (Vercel Storage integration or [neon.tech](https://neon.tech)) and set `DATABASE_URL`.
4. Add environment variables in the Vercel project settings:
   - `APP_PASSWORD`
   - `SESSION_SECRET`
   - `CRON_SECRET`
5. Deploy. On first deploy, run migrations:

   ```bash
   npx drizzle-kit push
   ```

   Or use the Vercel CLI against your production database.

6. Seed production data:

   ```bash
   DATABASE_URL="..." npm run db:seed
   ```

7. **Vercel Cron** jobs are configured in `vercel.json`:
   - **08:00 UTC** — open snapshot (~09:00 CET)
   - **22:00 UTC** — close snapshot (~23:00 CET)

   Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically when `CRON_SECRET` is set.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed positions and cash |

## Pages

- `/` — Portfolio dashboard with metrics, allocation donut, and editable positions table
- `/cash` — Cash balance management
- `/returns` — Daily/weekly return charts and history
- `/login` — Password login

## API

- `GET /api/quotes?refresh=1` — Fetch cached or fresh quotes
- `GET /api/returns?period=day|week&from=&to=` — Return history
- `GET /api/cron/snapshot?type=open|close` — Cron snapshot (Bearer auth)

# Thrust

Personal portfolio tracker built with Next.js 16, Drizzle ORM, and Neon Postgres. Tracks ETF and crypto positions with live market quotes (Yahoo Finance for ETFs, CoinGecko for crypto), P/L calculations, cash balances, and automated daily return snapshots.

## Stack

- **Next.js 16** (App Router) + React 19
- **Tailwind CSS v4** (dark-only UI)
- **Drizzle ORM** + **Neon Postgres** (`@neondatabase/serverless`)
- **Yahoo Finance** + **CoinGecko** + **Frankfurter** for market data
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
   | `APP_PASSWORD` | Login password (plain text in dev; bcrypt hash required in production) |
   | `SESSION_SECRET` | Random string, 32+ characters |
   | `CRON_SECRET` | Bearer token for cron snapshot endpoint |

3. Push the database schema:

   ```bash
   npm run db:push
   ```

4. Seed reference data (exchanges and FX quote source):

   ```bash
   npm run db:seed
   ```

   Add your positions from the portfolio UI after signing in.

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

6. Seed reference data on production (if not already present):

   ```bash
   DATABASE_URL="..." npm run db:seed
   ```

7. **Vercel Cron** jobs are configured in `vercel.json`:
   Vercel Cron jobs (UTC), prices 5 min before each snapshot as cache fallback:
   - **06:35 UTC** — price refresh
   - **06:40 UTC** — open snapshot (~07:40 CET)
   - **21:55 UTC** — price refresh
   - **22:00 UTC** — close snapshot (~23:00 CET)

   Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically when `CRON_SECRET` is set.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed exchanges and FX quote source |

## Pages

- `/` — Portfolio dashboard with metrics, allocation donut, and editable positions table
- `/cash` — Cash balance management
- `/returns` — Daily/weekly return charts and history
- `/errors` — Production error log dashboard
- `/login` — Password login

## API

- `GET /api/quotes` — Fetch cached quotes
- `POST /api/quotes` — Refresh quotes from market data providers
- `GET /api/returns?period=day|week&from=&to=` — Return history
- `GET /api/cron/snapshot?type=open|close` — Cron snapshot (Bearer auth)

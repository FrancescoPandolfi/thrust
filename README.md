# Thrust

Personal portfolio tracker built with Next.js 16, Drizzle ORM, and Neon Postgres. Tracks ETF and crypto positions with live market quotes (Yahoo Finance for ETFs, CoinGecko for crypto), P/L calculations, cash balances, and automated daily return snapshots.

## Stack

- **Next.js 16** (App Router) + React 19
- **Tailwind CSS v4** (dark-only UI)
- **Drizzle ORM** + **Neon Postgres** (`@neondatabase/serverless`)
- **Yahoo Finance** + **CoinGecko** + **Frankfurter** for market data
- **Recharts** for return and portfolio history charts
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
   | `SESSION_SECRET` | Random string, 32+ characters |
   | `CRON_SECRET` | Bearer token for cron snapshot endpoint |
   | `SEED_USER_EMAIL` | First account email (seed script only) |
   | `SEED_USER_PASSWORD` | First account password (seed script only; stored hashed in DB) |

3. Push the database schema:

   ```bash
   npm run db:push
   ```

4. Seed reference data and create your login account:

   ```bash
   npm run db:seed
   ```

   Set `SEED_USER_EMAIL` and `SEED_USER_PASSWORD` in `.env.local` before running seed. The password is hashed with bcrypt and stored in the `users` table. Re-running seed does not overwrite an existing account.

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
   - `SESSION_SECRET`
   - `CRON_SECRET`
5. Deploy. On first deploy, push the schema:

   ```bash
   npx drizzle-kit push
   ```

   Or use the Vercel CLI against your production database.

6. Seed reference data and the first user on production (if not already present):

   ```bash
   DATABASE_URL="..." SEED_USER_EMAIL="..." SEED_USER_PASSWORD="..." npm run db:seed
   ```

7. **Vercel Cron** (configured in `vercel.json`):
   - **22:00 UTC** — daily snapshot at midnight **Europe/Rome** (CEST: 00:00 Rome; CET: 23:00 Rome)

   Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically when `CRON_SECRET` is set.

## Returns model

- **Snapshots** store **positions value only** (ETF + crypto). Cash is excluded from returns and tracked separately on `/cash`.
- One snapshot per calendar day (`daily_snapshots.date` primary key).
- **Daily return for day D** = snapshot(D+1) − snapshot(D). `startValueEur` is snapshot(D), `endValueEur` is snapshot(D+1); `returnEur` and `returnPct` are derived in code, not stored.
- `return_pct` is a **decimal ratio** (e.g. `0.00535` = 0.54%). The UI formats it for display.
- **Today** uses the latest snapshot as start and live portfolio value as end until the next midnight snapshot closes the day.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed exchanges, FX quote source, and first user |
| `npm run db:check` | Verify database connectivity |

## Pages

- `/` — Portfolio dashboard with metrics, allocation donut, and editable positions table
- `/cash` — Cash balance management (not included in return calculations)
- `/returns` — Daily/weekly return charts and positions value history
- `/errors` — Production error log dashboard
- `/login` — Email + password login

## API

- `GET /api/quotes` — Fetch cached quotes
- `POST /api/quotes` — Refresh quotes from market data providers
- `GET /api/returns?period=day|week&from=&to=` — Return history and chart snapshots
- `GET /api/cron/snapshot` — Capture midnight snapshot and recompute returns (Bearer auth)

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
   - **Every 30 minutes** — refresh market quotes from Yahoo Finance / CoinGecko
   - **22:00 UTC** — daily snapshot at midnight **Europe/Rome** (CEST: 00:00 Rome; CET: 23:00 Rome)

   Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically when `CRON_SECRET` is set. Cron jobs that run more often than once per day require a Vercel Pro plan; with Hobby, quotes still auto-refresh every 30 minutes while an admin has the app open.

## User roles

Two roles control what a logged-in user can do:

| Role | Access |
|------|--------|
| `admin` | Full read/write on portfolio, cash, and price refresh. Can manage users. |
| `viewer` | Read-only: portfolio, cash, returns, flows, and cached diagnostics. Cannot edit positions, cash, refresh prices, or manage users. |

The portfolio is shared — all users see the same data. Roles only control whether edits are allowed.

### Creating analyst (viewer) accounts

1. Sign in as an **admin** (your seed account is created with `role: admin`).
2. Open **Users** in the navigation (`/settings/users`).
3. Create a new user with role **Viewer (read-only)** and a dedicated password.
4. Share the credentials with your analyst. They will see a **Read-only** badge in the header.

Write operations are blocked server-side for viewers, not only in the UI.

## Returns model

- **Snapshots** store **positions value only** (ETF + crypto). Cash is excluded from returns and tracked separately on `/cash`.
- One snapshot per calendar day (`daily_snapshots.date` primary key).
- **Daily return for day D** = snapshot(D+1) − snapshot(D) − net capital flows on D. Flows are recorded when you change load value (buy/sell) or add/remove positions; each row stores the position title, EUR amount, and share delta. `startValueEur` is snapshot(D), `endValueEur` is snapshot(D+1); `returnEur` and `returnPct` are derived in code, not stored.
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
| `npm run db:backup` | Dump database to `backups/thrust-YYYY-MM-DD.dump` |

## Daily local backups

Thrust does not back up the database by itself. To keep a **local copy on your Mac** every day:

### 1. Install `pg_dump`

```bash
brew install libpq
echo 'export PATH="/opt/homebrew/opt/libpq/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### 2. Test a manual backup

```bash
npm run db:backup
```

This writes a compressed dump to `backups/thrust-YYYY-MM-DD.dump` (gitignored). The script uses `DATABASE_URL` from `.env.local` and automatically switches from Neon's pooler host to the **direct** endpoint required by `pg_dump`.

Old dumps are deleted after 30 days (`RETENTION_DAYS` env var overrides this).

### 3. Schedule it daily (macOS)

```bash
REPO="/Users/x/Desktop/code/thrust"
sed "s|REPLACE_WITH_REPO_PATH|$REPO|g" scripts/com.thrust.db-backup.plist.example \
  > ~/Library/LaunchAgents/com.thrust.db-backup.plist
launchctl load ~/Library/LaunchAgents/com.thrust.db-backup.plist
```

Default time: **12:00** every day. Edit the plist to change the hour.

Check it ran:

```bash
tail -f backups/backup.log
launchctl list | grep thrust
```

Unload:

```bash
launchctl unload ~/Library/LaunchAgents/com.thrust.db-backup.plist
```

### Restore from a local dump

```bash
pg_restore --clean --if-exists --no-owner --no-acl \
  -d "$DATABASE_URL" backups/thrust-2026-07-03.dump
```

**Warning:** restore overwrites data on your single Neon database. Test on a Neon branch first if unsure.

### Cloud backups (optional)

Neon Console → **Backup & restore** → **Edit schedule** → **Daily** gives you snapshots on Neon's side even when your Mac is off. Use both for belt-and-suspenders: Neon for disaster recovery, local dumps for a file you control.

## Pages

- `/` — Portfolio dashboard with metrics, allocation donut, and editable positions table
- `/cash` — Cash balance management (not included in return calculations)
- `/returns` — Daily/weekly return charts and positions value history
- `/flows` — Capital flow history (buys, sells, new positions)
- `/settings` — Ticker diagnostics and cached price status
- `/settings/users` — User management (admin only)
- `/login` — Email + password login

## API

- `GET /api/quotes` — Fetch cached quotes
- `POST /api/quotes` — Refresh quotes from market data providers
- `GET /api/returns?period=day|week&from=&to=` — Return history and chart snapshots
- `GET /api/cron/quotes` — Refresh all position quotes (Bearer auth, every 30 min on Pro)
- `GET /api/cron/snapshot` — Capture midnight snapshot and recompute returns (Bearer auth)

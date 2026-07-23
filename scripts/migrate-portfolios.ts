/**
 * Safe migration for shared portfolios on the single production database.
 * Creates tables/columns as nullable, backfills a default portfolio, then
 * enforces NOT NULL and composite primary keys.
 *
 *   npm run db:migrate-portfolios
 */
import { sql } from "drizzle-orm";
import { getDb } from "../lib/db";
import { portfolioMembers, portfolios, users } from "../lib/schema";

async function exec(statement: string) {
  const db = getDb();
  await db.execute(sql.raw(statement));
}

async function main() {
  console.log("Starting portfolio migration...");

  await exec(`
    DO $$ BEGIN
      CREATE TYPE portfolio_role AS ENUM ('owner', 'admin', 'viewer');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS portfolios (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      name text NOT NULL,
      created_by_user_id uuid NOT NULL REFERENCES users(id),
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL
    )
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS portfolio_members (
      portfolio_id uuid NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role portfolio_role NOT NULL,
      created_at timestamptz DEFAULT now() NOT NULL,
      PRIMARY KEY (portfolio_id, user_id)
    )
  `);

  for (const table of ["positions", "cash_balances", "capital_flows", "daily_snapshots"]) {
    await exec(`
      ALTER TABLE ${table}
      ADD COLUMN IF NOT EXISTS portfolio_id uuid REFERENCES portfolios(id) ON DELETE CASCADE
    `);
  }

  const db = getDb();
  const [owner] = await db.select().from(users).orderBy(users.createdAt).limit(1);
  if (!owner) {
    throw new Error("No users found. Create a user first (npm run db:seed).");
  }

  let [defaultPortfolio] = await db.select().from(portfolios).limit(1);
  if (!defaultPortfolio) {
    console.log(`Creating default portfolio "Main" for ${owner.email}...`);
    [defaultPortfolio] = await db
      .insert(portfolios)
      .values({
        name: "Main",
        createdByUserId: owner.id,
      })
      .returning();

    const allUsers = await db.select({ id: users.id }).from(users);
    for (const user of allUsers) {
      await db
        .insert(portfolioMembers)
        .values({
          portfolioId: defaultPortfolio.id,
          userId: user.id,
          role: user.id === owner.id ? "owner" : "admin",
        })
        .onConflictDoNothing();
    }
  }

  const portfolioId = defaultPortfolio.id;
  console.log(`Using default portfolio: ${portfolioId}`);

  for (const table of ["positions", "cash_balances", "capital_flows", "daily_snapshots"]) {
    await exec(`
      UPDATE ${table}
      SET portfolio_id = '${portfolioId}'
      WHERE portfolio_id IS NULL
    `);
  }

  await exec(`
    DO $$
    DECLARE pk_name text;
    BEGIN
      SELECT tc.constraint_name INTO pk_name
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'daily_snapshots'
        AND tc.constraint_type = 'PRIMARY KEY'
      LIMIT 1;

      IF pk_name IS NOT NULL AND pk_name <> '' THEN
        EXECUTE format('ALTER TABLE daily_snapshots DROP CONSTRAINT %I', pk_name);
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'daily_snapshots'
          AND tc.constraint_type = 'PRIMARY KEY'
      ) THEN
        ALTER TABLE daily_snapshots ADD PRIMARY KEY (portfolio_id, date);
      END IF;
    END $$
  `);

  for (const table of ["positions", "cash_balances", "capital_flows", "daily_snapshots"]) {
    await exec(`
      ALTER TABLE ${table}
      ALTER COLUMN portfolio_id SET NOT NULL
    `);
  }

  console.log("Portfolio migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

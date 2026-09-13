/**
 * Moves cash_balances and real_estate_assets from portfolio scope to user scope.
 * Backfills user_id from the portfolio owner, then drops portfolio_id.
 *
 *   npm run db:migrate-user-assets
 */
import { sql } from "drizzle-orm";
import { getDb } from "../lib/db";

async function exec(statement: string) {
  const db = getDb();
  await db.execute(sql.raw(statement));
}

async function migrateTable(table: string) {
  const hasPortfolioId = await getDb().execute(sql.raw(`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = '${table}'
      AND column_name = 'portfolio_id'
    LIMIT 1
  `));

  if (hasPortfolioId.rows.length === 0) {
    console.log(`  ${table}: already migrated, skipping`);
    return;
  }

  console.log(`  ${table}: adding user_id...`);
  await exec(`
    ALTER TABLE ${table}
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE CASCADE
  `);

  console.log(`  ${table}: backfilling user_id from portfolio owner...`);
  await exec(`
    UPDATE ${table} AS asset
    SET user_id = portfolio.created_by_user_id
    FROM portfolios AS portfolio
    WHERE asset.portfolio_id = portfolio.id
      AND asset.user_id IS NULL
  `);

  await exec(`
    DELETE FROM ${table}
    WHERE user_id IS NULL
  `);

  console.log(`  ${table}: dropping portfolio_id...`);
  await exec(`
    ALTER TABLE ${table}
    DROP COLUMN IF EXISTS portfolio_id
  `);

  await exec(`
    ALTER TABLE ${table}
    ALTER COLUMN user_id SET NOT NULL
  `);
}

async function main() {
  console.log("Starting user-assets migration...");

  for (const table of ["cash_balances", "real_estate_assets"]) {
    await migrateTable(table);
  }

  console.log("User-assets migration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

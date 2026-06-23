import { getDb } from "../lib/db";
import { cashBalances, positions } from "../lib/schema";

async function main() {
  const db = getDb();
  const [pos, cash] = await Promise.all([
    db.select().from(positions),
    db.select().from(cashBalances),
  ]);

  console.log("Database connection OK");
  console.log(`- ${pos.length} positions`);
  console.log(`- ${cash.length} cash balance(s)`);
  if (pos[0]) {
    console.log(`- First position: ${pos[0].title}`);
  }
}

main().catch((error) => {
  console.error("Database check failed:", error);
  process.exit(1);
});

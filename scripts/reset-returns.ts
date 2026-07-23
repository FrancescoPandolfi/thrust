/**
 * Delete daily snapshots and capital flows for return history reset.
 *
 * Examples:
 *   npm run db:reset-returns -- --all --confirm
 *   npm run db:reset-returns -- --portfolio-id=<uuid> --confirm --baseline
 */
import { eq } from "drizzle-orm";
import {
  resetAllPortfolioReturns,
  resetPortfolioReturns,
} from "../lib/returns-reset";
import { getDb } from "../lib/db";
import { portfolios } from "../lib/schema";

function parseArgs(argv: string[]) {
  const all = argv.includes("--all");
  const confirm = argv.includes("--confirm");
  const baseline = argv.includes("--baseline");
  const portfolioIdArg = argv.find((arg) => arg.startsWith("--portfolio-id="));
  const portfolioId = portfolioIdArg?.split("=")[1]?.trim() || null;
  return { all, confirm, baseline, portfolioId };
}

async function main() {
  const { all, confirm, baseline, portfolioId } = parseArgs(process.argv.slice(2));

  if (!confirm) {
    console.error("Refusing to run without --confirm (this deletes live return history).");
    process.exit(1);
  }

  if (!all && !portfolioId) {
    console.error("Pass --all or --portfolio-id=<uuid>.");
    process.exit(1);
  }

  if (all && portfolioId) {
    console.error("Use either --all or --portfolio-id, not both.");
    process.exit(1);
  }

  if (portfolioId) {
    const db = getDb();
    const [portfolio] = await db
      .select({ id: portfolios.id, name: portfolios.name })
      .from(portfolios)
      .where(eq(portfolios.id, portfolioId))
      .limit(1);

    if (!portfolio) {
      console.error(`Portfolio not found: ${portfolioId}`);
      process.exit(1);
    }

    console.log(`Resetting returns for "${portfolio.name}"...`);
    const result = await resetPortfolioReturns(portfolioId, { captureBaseline: baseline });
    console.log(result);
    return;
  }

  console.log("Resetting returns for all portfolios...");
  const results = await resetAllPortfolioReturns({ captureBaseline: baseline });
  for (const result of results) {
    const [portfolio] = await getDb()
      .select({ name: portfolios.name })
      .from(portfolios)
      .where(eq(portfolios.id, result.portfolioId))
      .limit(1);
    console.log(
      `- ${portfolio?.name ?? result.portfolioId}: removed ${result.snapshotsDeleted} snapshots, ${result.flowsDeleted} flows` +
        (baseline ? (result.baselineCaptured ? ", baseline captured" : ", baseline skipped") : ""),
    );
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

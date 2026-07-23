import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { capitalFlows, dailySnapshots } from "@/lib/schema";
import { listAllPortfolios } from "@/lib/portfolios";
import { captureSnapshotForPortfolio } from "@/lib/snapshots";

export type ResetPortfolioReturnsResult = {
  portfolioId: string;
  snapshotsDeleted: number;
  flowsDeleted: number;
  baselineCaptured: boolean;
};

export async function resetPortfolioReturns(
  portfolioId: string,
  options: { captureBaseline?: boolean } = {},
): Promise<ResetPortfolioReturnsResult> {
  const db = getDb();

  const snapshotRows = await db
    .select({ date: dailySnapshots.date })
    .from(dailySnapshots)
    .where(eq(dailySnapshots.portfolioId, portfolioId));

  const flowRows = await db
    .select({ id: capitalFlows.id })
    .from(capitalFlows)
    .where(eq(capitalFlows.portfolioId, portfolioId));

  await db
    .delete(dailySnapshots)
    .where(eq(dailySnapshots.portfolioId, portfolioId));
  await db.delete(capitalFlows).where(eq(capitalFlows.portfolioId, portfolioId));

  let baselineCaptured = false;
  if (options.captureBaseline) {
    try {
      await captureSnapshotForPortfolio(portfolioId);
      baselineCaptured = true;
    } catch {
      baselineCaptured = false;
    }
  }

  return {
    portfolioId,
    snapshotsDeleted: snapshotRows.length,
    flowsDeleted: flowRows.length,
    baselineCaptured,
  };
}

export async function resetAllPortfolioReturns(options: {
  captureBaseline?: boolean;
} = {}): Promise<ResetPortfolioReturnsResult[]> {
  const all = await listAllPortfolios();
  const results: ResetPortfolioReturnsResult[] = [];
  for (const portfolio of all) {
    results.push(await resetPortfolioReturns(portfolio.id, options));
  }
  return results;
}

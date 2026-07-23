import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { computePortfolio } from "./calculations";
import { getPortfolioContext } from "./auth";
import { getDb } from "./db";
import { getQuoteMap, hasMissingQuotes } from "./prices";
import { positionToInstrument } from "./instruments";
import { dailySnapshots, portfolios, positions } from "./schema";
import { listAllPortfolios } from "./portfolios";

export function getRomeDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function resolvePortfolioIds(): Promise<string[]> {
  const context = await getPortfolioContext();
  if (!context) {
    throw new Error("No portfolio access");
  }
  if (context.viewMode === "aggregate") {
    return context.aggregatePortfolioIds;
  }
  return [context.id];
}

export async function getPositionsValueEur(
  refresh = true,
  portfolioIds?: string[],
) {
  const ids = portfolioIds ?? (await resolvePortfolioIds());
  const db = getDb();
  const posRows = await db
    .select()
    .from(positions)
    .where(inArray(positions.portfolioId, ids))
    .orderBy(positions.sortOrder);

  const instruments = posRows.map(positionToInstrument);
  let quotes = await getQuoteMap(instruments, {
    refresh,
    bypassCooldown: refresh,
  });
  if (hasMissingQuotes([...quotes.values()])) {
    quotes = await getQuoteMap(instruments, { refresh: false });
  }
  const { totals } = computePortfolio(posRows, [], quotes, false);
  return totals.positionsValueEur;
}

export async function captureSnapshotForPortfolio(portfolioId: string) {
  const db = getDb();
  const date = getRomeDate();
  const positionsValueEur = await getPositionsValueEur(true, [portfolioId]);

  await db
    .insert(dailySnapshots)
    .values({
      portfolioId,
      date,
      positionsValueEur: String(positionsValueEur),
    })
    .onConflictDoUpdate({
      target: [dailySnapshots.portfolioId, dailySnapshots.date],
      set: {
        positionsValueEur: String(positionsValueEur),
        capturedAt: new Date(),
      },
    });

  return { portfolioId, date, positionsValueEur };
}

export async function captureAllSnapshots() {
  const all = await listAllPortfolios();
  const results = [];
  for (const portfolio of all) {
    results.push(await captureSnapshotForPortfolio(portfolio.id));
  }
  return results;
}

/** @deprecated Use captureAllSnapshots or captureSnapshotForPortfolio */
export async function captureSnapshot() {
  const context = await getPortfolioContext();
  if (context && context.viewMode === "single") {
    return captureSnapshotForPortfolio(context.id);
  }
  const all = await captureAllSnapshots();
  return all[0] ?? { portfolioId: "", date: getRomeDate(), positionsValueEur: 0 };
}

export async function getAggregatedSnapshotsByDate(
  portfolioIds: string[],
  from: string,
  to: string,
) {
  const db = getDb();
  const rows = await db
    .select()
    .from(dailySnapshots)
    .where(
      and(
        inArray(dailySnapshots.portfolioId, portfolioIds),
        gte(dailySnapshots.date, from),
        lte(dailySnapshots.date, to),
      ),
    );

  const byDate = new Map<string, number>();
  for (const row of rows) {
    const value = Number.parseFloat(String(row.positionsValueEur));
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + value);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, positionsValueEur]) => ({ date, positionsValueEur }));
}

export async function listPortfolioNames(
  portfolioIds: string[],
): Promise<Map<string, string>> {
  const db = getDb();
  const rows = await db
    .select({ id: portfolios.id, name: portfolios.name })
    .from(portfolios)
    .where(inArray(portfolios.id, portfolioIds));
  return new Map(rows.map((row) => [row.id, row.name]));
}

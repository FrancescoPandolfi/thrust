import { and, eq, inArray } from "drizzle-orm";
import { computePortfolio, groupByCategory } from "@/lib/calculations";
import { getPortfolioContext } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getQuoteMap, getUsdPerEur } from "@/lib/prices";
import { positionToInstrument, quoteKey } from "@/lib/instruments";
import { cashBalances, positions, type Position } from "@/lib/schema";

function mergePositionsByInstrument(rows: Position[]): Position[] {
  const merged = new Map<string, Position>();

  for (const row of rows) {
    const key = quoteKey(positionToInstrument(row)) || row.id;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...row });
      continue;
    }

    const shares =
      Number.parseFloat(String(existing.shares)) +
      Number.parseFloat(String(row.shares));
    const loadValueEur =
      Number.parseFloat(String(existing.loadValueEur)) +
      Number.parseFloat(String(row.loadValueEur));

    merged.set(key, {
      ...existing,
      shares: String(shares),
      loadValueEur: String(loadValueEur),
      title: existing.title,
    });
  }

  return [...merged.values()].sort(
    (a, b) => Number.parseFloat(String(a.sortOrder)) - Number.parseFloat(String(b.sortOrder)),
  );
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

export async function loadPortfolioData(refresh = false) {
  const portfolioIds = await resolvePortfolioIds();
  const db = getDb();
  const [posRows, cashRows] = await Promise.all([
    db
      .select()
      .from(positions)
      .where(inArray(positions.portfolioId, portfolioIds))
      .orderBy(positions.sortOrder),
    db
      .select()
      .from(cashBalances)
      .where(inArray(cashBalances.portfolioId, portfolioIds)),
  ]);

  const mergedPositions =
    portfolioIds.length > 1 ? mergePositionsByInstrument(posRows) : posRows;

  const instruments = mergedPositions.map(positionToInstrument);
  const [quotes, usdPerEur] = await Promise.all([
    getQuoteMap(instruments, { refresh }),
    getUsdPerEur(),
  ]);
  const { positions: computed, totals } = computePortfolio(
    mergedPositions,
    cashRows,
    quotes,
    true,
    usdPerEur,
  );

  const groups = groupByCategory(computed);
  const allocation = (["equity_etf", "bond_etf", "crypto"] as const)
    .map((cat) => ({
      name:
        cat === "equity_etf"
          ? "Equity ETF"
          : cat === "bond_etf"
            ? "Bond ETF"
            : "Crypto",
      value: (groups[cat] ?? []).reduce((s, p) => s + p.valueEur, 0),
    }))
    .filter((d) => d.value > 0);

  return { positions: computed, totals, allocation, portfolioIds };
}

export async function loadPositionsForPortfolio(
  portfolioId: string,
  refresh = false,
) {
  const db = getDb();
  const posRows = await db
    .select()
    .from(positions)
    .where(eq(positions.portfolioId, portfolioId))
    .orderBy(positions.sortOrder);

  const instruments = posRows.map(positionToInstrument);
  const quotes = await getQuoteMap(instruments, { refresh });
  return { posRows, quotes };
}

export async function verifyPositionInActivePortfolio(
  positionId: string,
): Promise<Position | null> {
  const portfolioIds = await resolvePortfolioIds();
  if (portfolioIds.length !== 1) {
    return null;
  }

  const db = getDb();
  const [row] = await db
    .select()
    .from(positions)
    .where(
      and(
        eq(positions.id, positionId),
        eq(positions.portfolioId, portfolioIds[0]),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function verifyCashInActivePortfolio(
  cashId: string,
): Promise<{ id: string; portfolioId: string } | null> {
  const portfolioIds = await resolvePortfolioIds();
  if (portfolioIds.length !== 1) {
    return null;
  }

  const db = getDb();
  const [row] = await db
    .select({ id: cashBalances.id, portfolioId: cashBalances.portfolioId })
    .from(cashBalances)
    .where(
      and(
        eq(cashBalances.id, cashId),
        eq(cashBalances.portfolioId, portfolioIds[0]),
      ),
    )
    .limit(1);
  return row ?? null;
}

import { computePortfolio, groupByCategory } from "@/lib/calculations";
import { getDb } from "@/lib/db";
import { getQuoteMap } from "@/lib/prices";
import { positionToInstrument } from "@/lib/instruments";
import { cashBalances, positions } from "@/lib/schema";

export async function loadPortfolioData(refresh = false) {
  const db = getDb();
  const [posRows, cashRows] = await Promise.all([
    db.select().from(positions).orderBy(positions.sortOrder),
    db.select().from(cashBalances),
  ]);

  const instruments = posRows.map(positionToInstrument);
  const quotes = await getQuoteMap(instruments, { refresh });
  const { positions: computed, totals } = computePortfolio(
    posRows,
    cashRows,
    quotes,
    true,
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

  return { positions: computed, totals, allocation };
}

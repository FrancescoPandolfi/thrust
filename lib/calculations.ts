import type { CashBalance, Position } from "./schema";
import type { Quote } from "./prices";

export type ComputedPosition = Position & {
  price: number;
  priceEur: number;
  valueEur: number;
  plEur: number;
  plPct: number;
  weightPct: number;
  stale?: boolean;
};

export type PortfolioTotals = {
  positionsValueEur: number;
  cashValueEur: number;
  totalValueEur: number;
  totalLoadEur: number;
  totalPlEur: number;
  totalPlPct: number;
};

function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number.parseFloat(v);
}

export function computePortfolio(
  positions: Position[],
  cash: CashBalance[],
  quotes: Map<string, Quote>,
  includeCash = true,
): { positions: ComputedPosition[]; totals: PortfolioTotals } {
  const cashValueEur = cash.reduce((sum, c) => sum + toNum(c.amountEur), 0);

  const computed: ComputedPosition[] = positions.map((pos) => {
    const quote = quotes.get(pos.yahooSymbol);
    const price = quote?.price ?? 0;
    const priceEur = quote?.priceEur ?? 0;
    const shares = toNum(pos.shares);
    const loadValueEur = toNum(pos.loadValueEur);
    const valueEur = shares * priceEur;
    const plEur = valueEur - loadValueEur;
    const plPct = loadValueEur > 0 ? valueEur / loadValueEur - 1 : 0;

    return {
      ...pos,
      price,
      priceEur,
      valueEur,
      plEur,
      plPct,
      weightPct: 0,
      stale: quote?.stale,
    };
  });

  const positionsValueEur = computed.reduce((s, p) => s + p.valueEur, 0);
  const totalLoadEur = computed.reduce((s, p) => s + toNum(p.loadValueEur), 0);
  const totalValueEur = includeCash
    ? positionsValueEur + cashValueEur
    : positionsValueEur;
  const totalPlEur = computed.reduce((s, p) => s + p.plEur, 0);
  const totalPlPct = totalLoadEur > 0 ? positionsValueEur / totalLoadEur - 1 : 0;

  const withWeights = computed.map((p) => ({
    ...p,
    weightPct: totalValueEur > 0 ? (p.valueEur / totalValueEur) * 100 : 0,
  }));

  return {
    positions: withWeights,
    totals: {
      positionsValueEur,
      cashValueEur,
      totalValueEur,
      totalLoadEur,
      totalPlEur,
      totalPlPct,
    },
  };
}

export function groupByCategory(
  positions: ComputedPosition[],
): Record<string, ComputedPosition[]> {
  const groups: Record<string, ComputedPosition[]> = {
    equity_etf: [],
    bond_etf: [],
    crypto: [],
  };
  for (const pos of positions) {
    groups[pos.category]?.push(pos);
  }
  return groups;
}

export const CATEGORY_LABELS: Record<string, string> = {
  equity_etf: "Equity ETF",
  bond_etf: "Bond ETF",
  crypto: "Crypto",
};

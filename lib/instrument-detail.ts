import YahooFinance from "yahoo-finance2";
import type { ComputedPosition, PortfolioTotals } from "./calculations";
import {
  getCapitalFlowsForPositions,
  type CapitalFlowRow,
} from "./capital-flows";
import { getPortfolioContext } from "./auth";
import { getDb } from "./db";
import {
  isCryptoInstrument,
  isEtfInstrument,
  positionToInstrument,
  quoteKey,
  toYahooSymbol,
} from "./instruments";
import { loadMarketContext } from "./market-data";
import { loadPortfolioData } from "./portfolio";
import {
  getPriceHistory,
  type PriceHistoryPoint,
  type PriceHistoryRange,
} from "./price-history";
import { getQuoteProvider, type QuoteProvider } from "./prices";
import { positions } from "./schema";
import { inArray } from "drizzle-orm";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export type InstrumentMetadata = {
  longName: string | null;
  currency: string | null;
  exchange: string | null;
  marketCap: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  trailingPE: number | null;
  dividendYield: number | null;
  expenseRatio: number | null;
  category: string | null;
  fundFamily: string | null;
};

export type InstrumentDetail = {
  position: ComputedPosition;
  totals: PortfolioTotals;
  flows: CapitalFlowRow[];
  priceHistory: PriceHistoryPoint[];
  metadata: InstrumentMetadata | null;
  provider: QuoteProvider;
};

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

async function getPositionIdsForInstrument(
  symbolKey: string,
  portfolioIds: string[],
): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(positions)
    .where(inArray(positions.portfolioId, portfolioIds));

  return rows
    .filter((row) => quoteKey(positionToInstrument(row)) === symbolKey)
    .map((row) => row.id);
}

function toNum(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

async function fetchInstrumentMetadata(
  instrument: ReturnType<typeof positionToInstrument>,
): Promise<InstrumentMetadata | null> {
  if (isCryptoInstrument(instrument)) return null;

  const yahooSymbol = toYahooSymbol(instrument);
  if (!yahooSymbol) return null;

  try {
    const summary = await yahooFinance.quoteSummary(yahooSymbol, {
      modules: ["price", "summaryDetail", "fundProfile", "defaultKeyStatistics"],
    });

    return {
      longName: summary.price?.longName ?? summary.price?.shortName ?? null,
      currency: summary.price?.currency ?? summary.summaryDetail?.currency ?? null,
      exchange: summary.price?.exchangeName ?? null,
      marketCap: toNum(summary.summaryDetail?.marketCap),
      fiftyTwoWeekHigh: toNum(summary.summaryDetail?.fiftyTwoWeekHigh),
      fiftyTwoWeekLow: toNum(summary.summaryDetail?.fiftyTwoWeekLow),
      trailingPE: toNum(summary.summaryDetail?.trailingPE),
      dividendYield: toNum(summary.summaryDetail?.dividendYield),
      expenseRatio: toNum(summary.fundProfile?.feesExpensesInvestment?.annualReportExpenseRatio),
      category: summary.fundProfile?.categoryName ?? null,
      fundFamily: summary.fundProfile?.family ?? null,
    };
  } catch (error) {
    console.error(`Instrument metadata fetch failed for ${yahooSymbol}:`, error);
    return null;
  }
}

export async function loadInstrumentDetail(
  rawSymbol: string,
  range: PriceHistoryRange = "1Y",
): Promise<InstrumentDetail | null> {
  const symbolKey = decodeURIComponent(rawSymbol).trim().toUpperCase();
  const [{ positions: computed, totals }, portfolioIds, ctx] = await Promise.all([
    loadPortfolioData(),
    resolvePortfolioIds(),
    loadMarketContext(),
  ]);

  const position = computed.find(
    (row) => quoteKey(positionToInstrument(row)) === symbolKey,
  );
  if (!position) return null;

  const instrument = positionToInstrument(position);
  const shares = Number.parseFloat(position.shares);
  const positionIds = await getPositionIdsForInstrument(symbolKey, portfolioIds);

  const [priceHistory, flows, metadata] = await Promise.all([
    getPriceHistory(instrument, shares, range),
    getCapitalFlowsForPositions(positionIds),
    isEtfInstrument(instrument)
      ? fetchInstrumentMetadata(instrument)
      : Promise.resolve(null),
  ]);

  return {
    position,
    totals,
    flows,
    priceHistory,
    metadata,
    provider: getQuoteProvider(instrument, ctx),
  };
}

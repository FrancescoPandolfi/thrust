import YahooFinance from "yahoo-finance2";
import { formatIsoDate, subDays } from "./dates";
import {
  isCryptoInstrument,
  isEtfInstrument,
  normalizeInstrument,
  toYahooSymbol,
  type InstrumentRef,
} from "./instruments";
import { loadMarketContext } from "./market-data";
import { getQuoteProvider, getUsdPerEur } from "./prices";

export type PriceHistoryRange = "3M" | "6M" | "1Y" | "All";

export type PriceHistoryPoint = {
  date: string;
  priceEur: number;
  valueEur: number;
};

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const RANGE_DAYS: Record<PriceHistoryRange, number | null> = {
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  All: null,
};

function rangeToPeriod1(range: PriceHistoryRange): Date {
  const days = RANGE_DAYS[range];
  if (days == null) {
    return new Date("2015-01-01");
  }
  return subDays(new Date(), days);
}

function convertToEur(
  price: number,
  currency: string,
  usdPerEur: number,
): number {
  const cur = currency.toUpperCase();
  if (cur === "EUR") return price;
  if (cur === "USD") return price / usdPerEur;
  if (cur === "GBP") return price / 0.86;
  return price;
}

function normalizeYahooPrice(
  price: number,
  currency: string,
): { price: number; currency: string } {
  if (currency === "GBp") {
    return { price: price / 100, currency: "GBP" };
  }
  return { price, currency };
}

async function fetchYahooHistory(
  instrument: InstrumentRef,
  shares: number,
  range: PriceHistoryRange,
): Promise<PriceHistoryPoint[]> {
  const yahooSymbol = toYahooSymbol(instrument);
  if (!yahooSymbol) return [];

  const [chart, usdPerEur] = await Promise.all([
    yahooFinance.chart(yahooSymbol, {
      period1: rangeToPeriod1(range),
      interval: "1d",
    }),
    getUsdPerEur(),
  ]);

  const quotes = chart.quotes ?? [];
  const points: PriceHistoryPoint[] = [];

  for (const quote of quotes) {
    const rawClose = quote.close;
    if (rawClose == null || rawClose <= 0 || !quote.date) continue;

    const { price, currency } = normalizeYahooPrice(
      rawClose,
      chart.meta?.currency ?? "EUR",
    );
    const priceEur = convertToEur(price, currency, usdPerEur);
    const date =
      quote.date instanceof Date
        ? formatIsoDate(quote.date)
        : formatIsoDate(new Date(quote.date));

    points.push({
      date,
      priceEur,
      valueEur: shares * priceEur,
    });
  }

  return points;
}

async function fetchCoinGeckoHistory(
  instrument: InstrumentRef,
  shares: number,
  range: PriceHistoryRange,
): Promise<PriceHistoryPoint[]> {
  const id = instrument.coingeckoId;
  if (!id) return [];

  const days = RANGE_DAYS[range] ?? "max";
  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=eur&days=${days}`,
    {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    },
  );

  if (!response.ok) {
    throw new Error(`CoinGecko history ${response.status}`);
  }

  const data = (await response.json()) as {
    prices?: [number, number][];
  };

  const byDate = new Map<string, number>();
  for (const [timestamp, priceEur] of data.prices ?? []) {
    if (priceEur <= 0) continue;
    const date = formatIsoDate(new Date(timestamp));
    byDate.set(date, priceEur);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, priceEur]) => ({
      date,
      priceEur,
      valueEur: shares * priceEur,
    }));
}

export async function getPriceHistory(
  instrument: InstrumentRef,
  shares: number,
  range: PriceHistoryRange = "1Y",
): Promise<PriceHistoryPoint[]> {
  const normalized = normalizeInstrument(instrument);
  const ctx = await loadMarketContext();
  const provider = getQuoteProvider(normalized, ctx);

  try {
    if (isCryptoInstrument(normalized)) {
      return await fetchCoinGeckoHistory(normalized, shares, range);
    }
    if (isEtfInstrument(normalized)) {
      return await fetchYahooHistory(normalized, shares, range);
    }
    return [];
  } catch (error) {
    console.error("Price history fetch failed:", error);
    return [];
  }
}

export function periodReturnPct(points: PriceHistoryPoint[]): number | null {
  if (points.length < 2) return null;
  const first = points[0].priceEur;
  const last = points.at(-1)?.priceEur ?? 0;
  if (first <= 0) return null;
  return last / first - 1;
}

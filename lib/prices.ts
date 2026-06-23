import { eq, inArray } from "drizzle-orm";
import YahooFinance from "yahoo-finance2";
import { getDb } from "./db";
import { priceCache } from "./schema";

const yahooFinance = new YahooFinance();

const CACHE_TTL_MS = 10 * 60 * 1000;
const EURUSD_SYMBOL = "EURUSD=X";

export type Quote = {
  symbol: string;
  price: number;
  currency: string;
  priceEur: number;
  fetchedAt: Date;
  stale?: boolean;
};

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number.parseFloat(value);
}

async function getCachedQuotes(symbols: string[]): Promise<Map<string, Quote>> {
  const db = getDb();
  const rows = await db
    .select()
    .from(priceCache)
    .where(inArray(priceCache.yahooSymbol, symbols));

  const map = new Map<string, Quote>();
  const now = Date.now();
  for (const row of rows) {
    const fetchedAt = row.fetchedAt;
    const age = now - fetchedAt.getTime();
    map.set(row.yahooSymbol, {
      symbol: row.yahooSymbol,
      price: toNumber(row.price),
      currency: row.currency,
      priceEur: 0,
      fetchedAt,
      stale: age >= CACHE_TTL_MS,
    });
  }
  return map;
}

async function fetchEurUsdRate(): Promise<number> {
  const result = await yahooFinance.quote(EURUSD_SYMBOL);
  const price = result.regularMarketPrice ?? result.postMarketPrice;
  if (!price || price <= 0) {
    throw new Error("Unable to fetch EUR/USD rate");
  }
  return price;
}

function convertToEur(price: number, currency: string, eurUsdRate: number): number {
  const cur = currency.toUpperCase();
  if (cur === "EUR") return price;
  if (cur === "USD") return price / eurUsdRate;
  if (cur === "GBP") return price * 1.17;
  return price;
}

async function fetchAndCache(symbols: string[]): Promise<Map<string, Quote>> {
  const db = getDb();
  const eurUsdRate = await fetchEurUsdRate();
  const unique = [...new Set(symbols)];
  const results = new Map<string, Quote>();

  await Promise.all(
    unique.map(async (symbol) => {
      try {
        const result = await yahooFinance.quote(symbol);
        const price = result.regularMarketPrice ?? result.postMarketPrice ?? 0;
        const currency = result.currency ?? "USD";
        const fetchedAt = new Date();

        await db
          .insert(priceCache)
          .values({
            yahooSymbol: symbol,
            price: String(price),
            currency,
            fetchedAt,
          })
          .onConflictDoUpdate({
            target: priceCache.yahooSymbol,
            set: { price: String(price), currency, fetchedAt },
          });

        results.set(symbol, {
          symbol,
          price,
          currency,
          priceEur: convertToEur(price, currency, eurUsdRate),
          fetchedAt,
        });
      } catch (error) {
        console.error(`Failed to fetch quote for ${symbol}:`, error);
      }
    }),
  );

  if (!results.has(EURUSD_SYMBOL)) {
    results.set(EURUSD_SYMBOL, {
      symbol: EURUSD_SYMBOL,
      price: eurUsdRate,
      currency: "USD",
      priceEur: 1 / eurUsdRate,
      fetchedAt: new Date(),
    });
  }

  return results;
}

export async function getQuotes(
  symbols: string[],
  options: { refresh?: boolean } = {},
): Promise<Quote[]> {
  const unique = [...new Set(symbols.filter(Boolean))];
  if (unique.length === 0) return [];

  const cached = await getCachedQuotes(unique);
  const eurUsdRate = await fetchEurUsdRate().catch(() => 1.08);

  const needsFetch = options.refresh
    ? unique
    : unique.filter((s) => {
        const c = cached.get(s);
        return !c || c.stale;
      });

  let fresh = new Map<string, Quote>();
  if (needsFetch.length > 0) {
    fresh = await fetchAndCache(needsFetch);
  }

  return unique.map((symbol) => {
    const quote = fresh.get(symbol) ?? cached.get(symbol);
    if (!quote) {
      return {
        symbol,
        price: 0,
        currency: "EUR",
        priceEur: 0,
        fetchedAt: new Date(),
        stale: true,
      };
    }
    const priceEur =
      quote.priceEur || convertToEur(quote.price, quote.currency, eurUsdRate);
    return { ...quote, priceEur };
  });
}

export async function getQuoteMap(
  symbols: string[],
  options: { refresh?: boolean } = {},
): Promise<Map<string, Quote>> {
  const quotes = await getQuotes(symbols, options);
  return new Map(quotes.map((q) => [q.symbol, q]));
}

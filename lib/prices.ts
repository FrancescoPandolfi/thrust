import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { inArray } from "drizzle-orm";
import { getDb } from "./db";
import { priceCache } from "./schema";

const execFileAsync = promisify(execFile);

const CACHE_TTL_MS = 15 * 60 * 1000;
const MIN_FETCH_INTERVAL_MS = 2 * 60 * 1000;
const FETCH_DELAY_MS = 800;
const EURUSD_SYMBOL = "EURUSD=X";
const DEFAULT_EUR_USD = 1.08;

const COINGECKO_IDS: Record<string, string> = {
  "BTC-USD": "bitcoin",
  "ETH-USD": "ethereum",
  "SOL-USD": "solana",
};

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export type Quote = {
  symbol: string;
  price: number;
  currency: string;
  priceEur: number;
  fetchedAt: Date;
  stale?: boolean;
};

type ChartMeta = {
  symbol?: string;
  currency?: string;
  regularMarketPrice?: number;
  chartPreviousClose?: number;
};

let fetchInFlight: Promise<Map<string, Quote>> | null = null;
let lastSuccessfulFetchAt = 0;

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number.parseFloat(value);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isCryptoSymbol(symbol: string): boolean {
  return symbol in COINGECKO_IDS;
}

function isFxSymbol(symbol: string): boolean {
  return symbol === EURUSD_SYMBOL;
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

function convertToEur(price: number, currency: string, eurUsdRate: number): number {
  const cur = currency.toUpperCase();
  if (cur === "EUR") return price;
  if (cur === "USD") return price / eurUsdRate;
  if (cur === "GBP") return price * 1.17;
  return price;
}

function getEurUsdRate(
  quotes: Map<string, Quote>,
  fallback = DEFAULT_EUR_USD,
): number {
  const fx = quotes.get(EURUSD_SYMBOL);
  if (fx && fx.price > 0) return fx.price;
  return fallback;
}

function applyPriceEur(quotes: Map<string, Quote>): void {
  const eurUsdRate = getEurUsdRate(quotes);
  for (const quote of quotes.values()) {
    quote.priceEur = convertToEur(quote.price, quote.currency, eurUsdRate);
  }
}

async function persistQuotes(results: Map<string, Quote>): Promise<void> {
  const db = getDb();
  await Promise.all(
    [...results.values()].map((quote) =>
      db
        .insert(priceCache)
        .values({
          yahooSymbol: quote.symbol,
          price: String(quote.price),
          currency: quote.currency,
          fetchedAt: quote.fetchedAt,
        })
        .onConflictDoUpdate({
          target: priceCache.yahooSymbol,
          set: {
            price: String(quote.price),
            currency: quote.currency,
            fetchedAt: quote.fetchedAt,
          },
        }),
    ),
  );
}

async function fetchFrankfurterEurUsd(): Promise<Quote> {
  const response = await fetch(
    "https://api.frankfurter.dev/v1/latest?from=EUR&to=USD",
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(`Frankfurter API ${response.status}`);
  }

  const data = (await response.json()) as {
    rates?: { USD?: number };
  };

  const usdPerEur = data.rates?.USD;
  if (!usdPerEur || usdPerEur <= 0) {
    throw new Error("Frankfurter returned invalid EUR/USD rate");
  }

  return {
    symbol: EURUSD_SYMBOL,
    price: usdPerEur,
    currency: "USD",
    priceEur: 1 / usdPerEur,
    fetchedAt: new Date(),
  };
}

async function fetchCoinGeckoQuotes(symbols: string[]): Promise<Map<string, Quote>> {
  const results = new Map<string, Quote>();
  const pairs = symbols
    .filter(isCryptoSymbol)
    .map((symbol) => ({ symbol, id: COINGECKO_IDS[symbol] }));

  if (pairs.length === 0) return results;

  const ids = pairs.map((pair) => pair.id).join(",");
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
    {
      headers: { Accept: "application/json" },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`CoinGecko API ${response.status}`);
  }

  const data = (await response.json()) as Record<string, { usd?: number }>;
  const fetchedAt = new Date();

  for (const pair of pairs) {
    const price = data[pair.id]?.usd;
    if (price == null || price <= 0) continue;

    results.set(pair.symbol, {
      symbol: pair.symbol,
      price,
      currency: "USD",
      priceEur: 0,
      fetchedAt,
    });
  }

  return results;
}

async function fetchYahooChartCurl(symbol: string): Promise<Quote | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;

  const { stdout } = await execFileAsync(
    "curl",
    ["-s", "-L", "-H", `User-Agent: ${USER_AGENT}`, url],
    { timeout: 15_000, maxBuffer: 1024 * 1024 },
  );

  if (stdout.trimStart().startsWith("Too Many")) {
    throw new Error("Yahoo Finance rate limit (429)");
  }

  const data = JSON.parse(stdout) as {
    chart?: { result?: Array<{ meta?: ChartMeta }>; error?: unknown };
  };

  if (data.chart?.error) {
    throw new Error(`Yahoo chart error for ${symbol}`);
  }

  const meta = data.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice ?? meta?.chartPreviousClose;
  if (!meta?.symbol || price == null || price <= 0) {
    return null;
  }

  return {
    symbol: meta.symbol,
    price,
    currency: meta.currency ?? "EUR",
    priceEur: 0,
    fetchedAt: new Date(),
  };
}

async function fetchEtfQuotes(symbols: string[]): Promise<Map<string, Quote>> {
  const results = new Map<string, Quote>();

  for (const symbol of symbols) {
    if (isCryptoSymbol(symbol) || isFxSymbol(symbol)) continue;

    try {
      const quote = await fetchYahooChartCurl(symbol);
      if (quote) {
        results.set(symbol, quote);
      }
    } catch (error) {
      console.error(`ETF quote failed for ${symbol}:`, error);
      if (
        error instanceof Error &&
        error.message.includes("rate limit")
      ) {
        break;
      }
    }

    await sleep(FETCH_DELAY_MS);
  }

  return results;
}

async function fetchAllQuotes(symbols: string[]): Promise<Map<string, Quote>> {
  const unique = [...new Set(symbols.filter(Boolean))];
  const now = Date.now();

  if (now - lastSuccessfulFetchAt < MIN_FETCH_INTERVAL_MS) {
    const waitMin = Math.ceil(
      (MIN_FETCH_INTERVAL_MS - (now - lastSuccessfulFetchAt)) / 60000,
    );
    throw new Error(
      `Please wait ${waitMin} minute(s) before refreshing prices again`,
    );
  }

  const results = new Map<string, Quote>();
  const needsFx = unique.includes(EURUSD_SYMBOL) || unique.some(isCryptoSymbol);

  if (needsFx) {
    try {
      const fx = await fetchFrankfurterEurUsd();
      results.set(EURUSD_SYMBOL, fx);
    } catch (error) {
      console.error("Frankfurter FX fetch failed:", error);
    }
  }

  const cryptoSymbols = unique.filter(isCryptoSymbol);
  if (cryptoSymbols.length > 0) {
    try {
      const crypto = await fetchCoinGeckoQuotes(cryptoSymbols);
      for (const [symbol, quote] of crypto) {
        results.set(symbol, quote);
      }
    } catch (error) {
      console.error("CoinGecko fetch failed:", error);
    }
  }

  const etfQuotes = await fetchEtfQuotes(unique);
  for (const [symbol, quote] of etfQuotes) {
    results.set(symbol, quote);
  }

  if (results.size === 0) {
    throw new Error("No quotes returned from market data providers");
  }

  applyPriceEur(results);
  await persistQuotes(results);
  lastSuccessfulFetchAt = Date.now();
  return results;
}

async function fetchAndCache(symbols: string[]): Promise<Map<string, Quote>> {
  if (fetchInFlight) {
    return fetchInFlight;
  }

  fetchInFlight = (async () => {
    try {
      return await fetchAllQuotes(symbols);
    } finally {
      fetchInFlight = null;
    }
  })();

  return fetchInFlight;
}

export async function getQuotes(
  symbols: string[],
  options: { refresh?: boolean } = {},
): Promise<Quote[]> {
  const unique = [...new Set(symbols.filter(Boolean))];
  if (unique.length === 0) return [];

  const cacheSymbols = [...new Set([...unique, EURUSD_SYMBOL])];
  const cached = await getCachedQuotes(cacheSymbols);

  let fresh = new Map<string, Quote>();
  if (options.refresh) {
    try {
      fresh = await fetchAndCache(unique);
    } catch (error) {
      console.error("Quote refresh failed, using cached prices:", error);
    }
  }

  const merged = new Map<string, Quote>();
  for (const symbol of cacheSymbols) {
    const quote = fresh.get(symbol) ?? cached.get(symbol);
    if (quote) {
      merged.set(symbol, {
        ...quote,
        stale: fresh.has(symbol) ? false : (quote.stale ?? true),
      });
    }
  }

  applyPriceEur(merged);

  return unique.map((symbol) => {
    const quote = merged.get(symbol);
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
    return quote;
  });
}

export async function getQuoteMap(
  symbols: string[],
  options: { refresh?: boolean } = {},
): Promise<Map<string, Quote>> {
  const quotes = await getQuotes(symbols, options);
  return new Map(quotes.map((quote) => [quote.symbol, quote]));
}

export function hasMissingQuotes(quotes: Quote[]): boolean {
  return quotes.some((quote) => quote.price <= 0);
}

export function allQuotesStale(quotes: Quote[]): boolean {
  return quotes.length > 0 && quotes.every((quote) => quote.stale);
}

import { inArray } from "drizzle-orm";
import { getDb } from "./db";
import { priceCache } from "./schema";
import { resolveTwelveDataInstrument } from "./ticker-map";

const CACHE_TTL_MS = 15 * 60 * 1000;
const MIN_FETCH_INTERVAL_MS = 2 * 60 * 1000;
const EURUSD_SYMBOL = "EURUSD=X";

const DEFAULT_FX = {
  usdPerEur: 1.08,
  gbpPerEur: 0.86,
};

/** Stored symbols that differ from the listing used for market data. */
const QUOTE_SYMBOL_ALIASES: Record<string, string> = {
  "EM35.PA": "EM35.MI",
};

const COINGECKO_IDS: Record<string, string> = {
  "BTC-USD": "bitcoin",
  "BTC-EUR": "bitcoin",
  "ETH-USD": "ethereum",
  "ETH-EUR": "ethereum",
  "SOL-USD": "solana",
  "SOL-EUR": "solana",
};

type TwelveDataQuote = {
  symbol?: string;
  currency?: string;
  close?: string;
  status?: string;
  message?: string;
};

export type Quote = {
  symbol: string;
  price: number;
  currency: string;
  priceEur: number;
  fetchedAt: Date;
  stale?: boolean;
};

type FxRates = {
  usdPerEur: number;
  gbpPerEur: number;
};

let fetchInFlight: Promise<{ quotes: Map<string, Quote>; refreshed: Set<string> }> | null = null;
let lastSuccessfulFetchAt = 0;

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number.parseFloat(value);
}

function quoteFetchSymbol(symbol: string): string {
  return QUOTE_SYMBOL_ALIASES[symbol] ?? symbol;
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

function convertToEur(price: number, currency: string, fx: FxRates): number {
  const cur = currency.toUpperCase();
  if (cur === "EUR") return price;
  if (cur === "USD") return price / fx.usdPerEur;
  if (cur === "GBP") return price / fx.gbpPerEur;
  return price;
}

function applyPriceEur(quotes: Map<string, Quote>, fx: FxRates): void {
  for (const quote of quotes.values()) {
    quote.priceEur = convertToEur(quote.price, quote.currency, fx);
  }
}

async function loadFxRates(
  cachedQuotes: Map<string, Quote>,
): Promise<FxRates> {
  try {
    return await fetchFrankfurterRates();
  } catch (error) {
    console.error("Frankfurter FX fetch failed:", error);
    const cachedFx = cachedQuotes.get(EURUSD_SYMBOL);
    return {
      usdPerEur:
        cachedFx && cachedFx.price > 0 ? cachedFx.price : DEFAULT_FX.usdPerEur,
      gbpPerEur: DEFAULT_FX.gbpPerEur,
    };
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

async function fetchFrankfurterRates(): Promise<FxRates> {
  const response = await fetch(
    "https://api.frankfurter.dev/v1/latest?from=EUR&to=USD,GBP",
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(`Frankfurter API ${response.status}`);
  }

  const data = (await response.json()) as {
    rates?: { USD?: number; GBP?: number };
  };

  const usdPerEur = data.rates?.USD;
  const gbpPerEur = data.rates?.GBP;
  if (!usdPerEur || usdPerEur <= 0 || !gbpPerEur || gbpPerEur <= 0) {
    throw new Error("Frankfurter returned invalid FX rates");
  }

  return { usdPerEur, gbpPerEur };
}

async function fetchFrankfurterEurUsd(): Promise<Quote> {
  const fx = await fetchFrankfurterRates();

  return {
    symbol: EURUSD_SYMBOL,
    price: fx.usdPerEur,
    currency: "USD",
    priceEur: 1 / fx.usdPerEur,
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
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=eur`,
    {
      headers: { Accept: "application/json" },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`CoinGecko API ${response.status}`);
  }

  const data = (await response.json()) as Record<string, { eur?: number }>;
  const fetchedAt = new Date();

  for (const pair of pairs) {
    const priceEur = data[pair.id]?.eur;
    if (priceEur == null || priceEur <= 0) continue;

    results.set(pair.symbol, {
      symbol: pair.symbol,
      price: priceEur,
      currency: "EUR",
      priceEur,
      fetchedAt,
    });
  }

  return results;
}

function getTwelveDataApiKey(): string {
  const apiKey = process.env.TWELVEDATA_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "TWELVEDATA_API_KEY is not configured — get a free key at https://twelvedata.com/pricing",
    );
  }
  return apiKey;
}

function parseTwelveDataQuoteItem(
  data: Record<string, unknown>,
  ticker: string,
  batch: boolean,
): TwelveDataQuote | null {
  const item = batch ? data[ticker] : data;
  if (!item || typeof item !== "object") return null;

  const quote = item as TwelveDataQuote;
  if (quote.status === "error") return null;
  if (batch && quote.symbol && quote.symbol !== ticker) return null;
  return quote;
}

async function fetchTwelveDataGroup(
  apiKey: string,
  mic_code: string | undefined,
  yahooSymbols: string[],
  tickers: string[],
): Promise<Map<string, Quote>> {
  const results = new Map<string, Quote>();
  const params = new URLSearchParams({
    symbol: tickers.join(","),
    apikey: apiKey,
  });
  if (mic_code) {
    params.set("mic_code", mic_code);
  }

  const response = await fetch(
    `https://api.twelvedata.com/quote?${params.toString()}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Twelve Data rate limit (429)");
    }
    throw new Error(`Twelve Data HTTP ${response.status}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  if (data.status === "error") {
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : "Twelve Data returned an error",
    );
  }

  const batch = tickers.length > 1;
  const fetchedAt = new Date();

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i]!;
    const yahooSymbol = yahooSymbols[i]!;
    const item = parseTwelveDataQuoteItem(data, ticker, batch);
    if (!item) continue;

    const price = toNumber(item.close);
    if (price <= 0) continue;

    results.set(yahooSymbol, {
      symbol: yahooSymbol,
      price,
      currency: item.currency ?? "EUR",
      priceEur: 0,
      fetchedAt,
    });
  }

  return results;
}

async function fetchEtfQuotes(symbols: string[]): Promise<Map<string, Quote>> {
  const apiKey = getTwelveDataApiKey();
  const etfSymbols = [
    ...new Set(
      symbols
        .filter((symbol) => !isCryptoSymbol(symbol) && !isFxSymbol(symbol))
        .map(quoteFetchSymbol),
    ),
  ];
  if (etfSymbols.length === 0) return new Map();

  const groups = new Map<
    string,
    { yahooSymbols: string[]; tickers: string[] }
  >();

  for (const yahooSymbol of etfSymbols) {
    const { ticker, mic_code } = resolveTwelveDataInstrument(yahooSymbol);
    const micKey = mic_code ?? "";
    const group = groups.get(micKey) ?? { yahooSymbols: [], tickers: [] };
    group.yahooSymbols.push(yahooSymbol);
    group.tickers.push(ticker);
    groups.set(micKey, group);
  }

  const results = new Map<string, Quote>();
  for (const [micKey, group] of groups) {
    const mic_code = micKey || undefined;
    try {
      const groupQuotes = await fetchTwelveDataGroup(
        apiKey,
        mic_code,
        group.yahooSymbols,
        group.tickers,
      );
      for (const [symbol, quote] of groupQuotes) {
        results.set(symbol, quote);
      }
    } catch (error) {
      console.error(
        `Twelve Data quote failed for ${group.tickers.join(",")}:`,
        error,
      );
      if (
        error instanceof Error &&
        error.message.includes("rate limit")
      ) {
        break;
      }
    }
  }

  return results;
}

function symbolsNeedingRefresh(
  symbols: string[],
  cached: Map<string, Quote>,
): string[] {
  const now = Date.now();
  return symbols.filter((symbol) => {
    const quote = cached.get(symbol);
    if (!quote || quote.price <= 0) return true;
    return now - quote.fetchedAt.getTime() >= CACHE_TTL_MS;
  });
}

async function fetchAllQuotes(
  symbols: string[],
  options: { force?: boolean; bypassCooldown?: boolean } = {},
): Promise<{ quotes: Map<string, Quote>; refreshed: Set<string> }> {
  const unique = [...new Set(symbols.filter(Boolean))];
  const cacheSymbols = [...new Set([...unique, EURUSD_SYMBOL])];
  const cached = await getCachedQuotes(cacheSymbols);
  const toFetch = options.force
    ? unique
    : symbolsNeedingRefresh(unique, cached);
  const refreshed = new Set<string>();

  if (toFetch.length === 0) {
    const fx = await loadFxRates(cached);
    applyPriceEur(cached, fx);
    return { quotes: cached, refreshed };
  }

  const now = Date.now();
  if (
    !options.bypassCooldown &&
    now - lastSuccessfulFetchAt < MIN_FETCH_INTERVAL_MS
  ) {
    const waitMin = Math.ceil(
      (MIN_FETCH_INTERVAL_MS - (now - lastSuccessfulFetchAt)) / 60000,
    );
    throw new Error(
      `Please wait ${waitMin} minute(s) before refreshing prices again`,
    );
  }

  const results = new Map<string, Quote>(cached);

  try {
    const fxQuote = await fetchFrankfurterEurUsd();
    results.set(EURUSD_SYMBOL, fxQuote);
  } catch (error) {
    console.error("Frankfurter FX fetch failed:", error);
  }

  const fx = await loadFxRates(results);

  const cryptoSymbols = toFetch.filter(isCryptoSymbol);
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

  const etfQuotes = await fetchEtfQuotes(toFetch);
  for (const [symbol, quote] of etfQuotes) {
    results.set(symbol, quote);
  }

  const fetchedCount = [...results.entries()].filter(([symbol, quote]) => {
    if (!toFetch.includes(symbol)) return false;
    return quote.price > 0;
  }).length;

  if (fetchedCount === 0 && toFetch.some((s) => !isCryptoSymbol(s) && !isFxSymbol(s))) {
    throw new Error("No quotes returned from market data providers");
  }

  applyPriceEur(results, fx);

  const toPersist = new Map<string, Quote>();
  for (const symbol of toFetch) {
    const quote = results.get(symbol);
    if (quote && quote.price > 0) {
      toPersist.set(symbol, quote);
      refreshed.add(symbol);
    }
  }
  if (results.has(EURUSD_SYMBOL)) {
    toPersist.set(EURUSD_SYMBOL, results.get(EURUSD_SYMBOL)!);
    refreshed.add(EURUSD_SYMBOL);
  }
  if (toPersist.size > 0) {
    await persistQuotes(toPersist);
    lastSuccessfulFetchAt = Date.now();
  }

  return { quotes: results, refreshed };
}

async function fetchAndCache(
  symbols: string[],
  options: { force?: boolean; bypassCooldown?: boolean } = {},
): Promise<{ quotes: Map<string, Quote>; refreshed: Set<string> }> {
  if (fetchInFlight) {
    return fetchInFlight;
  }

  fetchInFlight = (async () => {
    try {
      return await fetchAllQuotes(symbols, options);
    } finally {
      fetchInFlight = null;
    }
  })();

  return fetchInFlight;
}

export type GetQuotesOptions = {
  refresh?: boolean;
  /** Re-fetch every symbol even if cache is fresh. */
  force?: boolean;
  /** Skip the 2-minute cooldown (cron jobs). */
  bypassCooldown?: boolean;
};

export async function refreshPortfolioQuotes(
  symbols: string[],
  options: Omit<GetQuotesOptions, "refresh"> = {},
): Promise<{ updated: string[]; skipped: string[] }> {
  const unique = [...new Set(symbols.filter(Boolean))];
  const cached = await getCachedQuotes(unique);
  const toFetch = options.force
    ? unique
    : symbolsNeedingRefresh(unique, cached);

  if (toFetch.length === 0) {
    return { updated: [], skipped: unique };
  }

  await fetchAndCache(unique, {
    force: options.force,
    bypassCooldown: options.bypassCooldown ?? true,
  });

  return {
    updated: toFetch,
    skipped: unique.filter((s) => !toFetch.includes(s)),
  };
}

export async function getQuotes(
  symbols: string[],
  options: GetQuotesOptions = {},
): Promise<Quote[]> {
  const unique = [...new Set(symbols.filter(Boolean))];
  if (unique.length === 0) return [];

  const cacheSymbols = [...new Set([...unique, EURUSD_SYMBOL])];
  const cached = await getCachedQuotes(cacheSymbols);

  let fresh = new Map<string, Quote>();
  let refreshed = new Set<string>();
  if (options.refresh) {
    try {
      const result = await fetchAndCache(unique, {
        force: options.force,
        bypassCooldown: options.bypassCooldown,
      });
      fresh = result.quotes;
      refreshed = result.refreshed;
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
        stale: refreshed.has(symbol) ? false : (quote.stale ?? true),
      });
    }
  }

  applyPriceEur(merged, await loadFxRates(merged));

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
  options: GetQuotesOptions = {},
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

export type QuoteProvider = "twelvedata" | "coingecko" | "frankfurter";

export function getQuoteProvider(symbol: string): QuoteProvider {
  if (isFxSymbol(symbol)) return "frankfurter";
  if (isCryptoSymbol(symbol)) return "coingecko";
  return "twelvedata";
}

async function fetchSingleQuote(symbol: string): Promise<Quote | null> {
  const provider = getQuoteProvider(symbol);
  let quote: Quote | null = null;

  if (provider === "frankfurter") {
    quote = await fetchFrankfurterEurUsd();
  } else if (provider === "coingecko") {
    const map = await fetchCoinGeckoQuotes([symbol]);
    quote = map.get(symbol) ?? null;
  } else {
    const map = await fetchEtfQuotes([symbol]);
    quote = map.get(quoteFetchSymbol(symbol)) ?? null;
  }

  if (!quote || quote.price <= 0) return null;

  const results = new Map<string, Quote>([[symbol, quote]]);
  const fx = await loadFxRates(results);
  applyPriceEur(results, fx);
  const finalQuote = results.get(symbol)!;
  await persistQuotes(new Map([[symbol, finalQuote]]));
  return { ...finalQuote, stale: false };
}

export type ProbeQuoteResult =
  | {
      quote: Quote;
      provider: QuoteProvider;
      ok: true;
    }
  | {
      quote: Quote | null;
      provider: QuoteProvider;
      ok: false;
      error: string;
    };

export async function probeQuote(
  symbol: string,
  options: { refresh?: boolean } = {},
): Promise<ProbeQuoteResult> {
  const provider = getQuoteProvider(symbol);

  if (options.refresh) {
    try {
      const quote = await fetchSingleQuote(symbol);
      if (!quote) {
        return {
          quote: null,
          provider,
          ok: false,
          error: "No price returned from provider",
        };
      }
      return { quote, provider, ok: true };
    } catch (error) {
      return {
        quote: null,
        provider,
        ok: false,
        error: error instanceof Error ? error.message : "Fetch failed",
      };
    }
  }

  const [quote] = await getQuotes([symbol], { refresh: false });
  if (quote.price <= 0) {
    return {
      quote,
      provider,
      ok: false,
      error: quote.stale
        ? "Not in cache — use live fetch"
        : "Missing price in cache",
    };
  }
  return { quote, provider, ok: true };
}

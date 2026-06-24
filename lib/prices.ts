import { and, eq, or } from "drizzle-orm";
import YahooFinance from "yahoo-finance2";
import { getDb } from "./db";
import {
  cacheIsin,
  cacheMicCode,
  createFxInstrument,
  type InstrumentRef,
  type MarketContext,
  type Quote,
  hasInstrumentId,
  instrumentFromCacheRow,
  isCryptoInstrument,
  isFxSymbol,
  normalizeInstrument,
  quoteKey,
  toYahooSymbol,
} from "./instruments";
import { loadMarketContext } from "./market-data";
import { priceCache } from "./schema";

const CACHE_TTL_MS = 15 * 60 * 1000;
const MIN_FETCH_INTERVAL_MS = 2 * 60 * 1000;
const FETCH_DELAY_MS = 800;

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const DEFAULT_FX = {
  usdPerEur: 1.08,
  gbpPerEur: 0.86,
};

export type { Quote } from "./instruments";

type FxRates = {
  usdPerEur: number;
  gbpPerEur: number;
};

let fetchInFlight: Promise<{
  quotes: Map<string, Quote>;
  refreshed: Set<string>;
}> | null = null;
let lastSuccessfulFetchAt = 0;

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number.parseFloat(value);
}

function uniqueInstruments(instruments: InstrumentRef[]): InstrumentRef[] {
  const seen = new Set<string>();
  const unique: InstrumentRef[] = [];
  for (const instrument of instruments) {
    const normalized = normalizeInstrument(instrument);
    const key = quoteKey(normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(normalized);
  }
  return unique;
}

async function getCachedQuotes(
  instruments: InstrumentRef[],
  ctx: MarketContext,
): Promise<Map<string, Quote>> {
  const unique = uniqueInstruments(instruments);
  if (unique.length === 0) return new Map();

  const db = getDb();
  const rows = await db
    .select()
    .from(priceCache)
    .where(
      or(
        ...unique.map((instrument) =>
          and(
            eq(priceCache.isin, cacheIsin(instrument)),
            eq(priceCache.micCode, cacheMicCode(instrument.micCode)),
          ),
        ),
      ),
    );

  const map = new Map<string, Quote>();
  const now = Date.now();
  for (const row of rows) {
    const instrument = instrumentFromCacheRow(row.isin, row.micCode, ctx);
    const fetchedAt = row.fetchedAt;
    const age = now - fetchedAt.getTime();
    map.set(quoteKey(instrument), {
      ...instrument,
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
  ctx: MarketContext,
): Promise<FxRates> {
  try {
    return await fetchFrankfurterRates();
  } catch (error) {
    console.error("Frankfurter FX fetch failed:", error);
    const fxInstrument = createFxInstrument(ctx);
    const cachedFx = cachedQuotes.get(quoteKey(fxInstrument));
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
          isin: cacheIsin(quote),
          micCode: cacheMicCode(quote.micCode),
          price: String(quote.price),
          currency: quote.currency,
          fetchedAt: quote.fetchedAt,
        })
        .onConflictDoUpdate({
          target: [priceCache.isin, priceCache.micCode],
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

async function fetchFrankfurterEurUsd(
  fxInstrument: InstrumentRef,
): Promise<Quote> {
  const fx = await fetchFrankfurterRates();

  return {
    ...fxInstrument,
    price: fx.usdPerEur,
    currency: "USD",
    priceEur: 1 / fx.usdPerEur,
    fetchedAt: new Date(),
  };
}

async function fetchCoinGeckoQuotes(
  instruments: InstrumentRef[],
): Promise<Map<string, Quote>> {
  const results = new Map<string, Quote>();
  const pairs = instruments
    .filter((instrument) => isCryptoInstrument(instrument))
    .map((instrument) => ({
      instrument,
      id: instrument.coingeckoId,
    }))
    .filter((pair): pair is { instrument: InstrumentRef; id: string } =>
      Boolean(pair.id),
    );

  if (pairs.length === 0) return results;

  const ids = [...new Set(pairs.map((pair) => pair.id))].join(",");
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

    results.set(quoteKey(pair.instrument), {
      ...pair.instrument,
      price: priceEur,
      currency: "EUR",
      priceEur,
      fetchedAt,
    });
  }

  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

type YahooQuote = {
  regularMarketPrice?: number;
  currency?: string;
};

async function fetchYahooQuote(
  yahooSymbol: string,
): Promise<{ price: number; currency: string } | null> {
  try {
    const quote = (await yahooFinance.quote(yahooSymbol)) as YahooQuote;
    const rawPrice = quote.regularMarketPrice;
    if (rawPrice == null || rawPrice <= 0) return null;
    return normalizeYahooPrice(rawPrice, quote.currency ?? "EUR");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/429|rate limit|too many/i.test(message)) {
      throw new Error("Yahoo Finance rate limit (429)");
    }
    throw error;
  }
}

async function fetchEtfQuotes(
  instruments: InstrumentRef[],
  ctx: MarketContext,
): Promise<Map<string, Quote>> {
  const etfInstruments = uniqueInstruments(
    instruments.filter(
      (instrument) =>
        !isCryptoInstrument(instrument) &&
        !isFxSymbol(instrument.symbol, ctx.fxSymbol),
    ),
  );
  if (etfInstruments.length === 0) return new Map();

  const results = new Map<string, Quote>();

  for (const instrument of etfInstruments) {
    const yahooSymbol = toYahooSymbol(instrument, ctx);
    if (!yahooSymbol) {
      console.error(`Missing Yahoo symbol for ${quoteKey(instrument)}`);
      continue;
    }

    try {
      const chart = await fetchYahooQuote(yahooSymbol);
      if (!chart || chart.price <= 0) continue;

      results.set(quoteKey(instrument), {
        ...instrument,
        price: chart.price,
        currency: chart.currency,
        priceEur: 0,
        fetchedAt: new Date(),
      });
    } catch (error) {
      console.error(`Yahoo quote failed for ${yahooSymbol}:`, error);
      if (error instanceof Error && error.message.includes("rate limit")) {
        break;
      }
    }

    await sleep(FETCH_DELAY_MS);
  }

  return results;
}

function instrumentsNeedingRefresh(
  instruments: InstrumentRef[],
  cached: Map<string, Quote>,
): InstrumentRef[] {
  const now = Date.now();
  return instruments.filter((instrument) => {
    const quote = cached.get(quoteKey(instrument));
    if (!quote || quote.price <= 0) return true;
    return now - quote.fetchedAt.getTime() >= CACHE_TTL_MS;
  });
}

async function fetchAllQuotes(
  instruments: InstrumentRef[],
  ctx: MarketContext,
  options: { force?: boolean; bypassCooldown?: boolean } = {},
): Promise<{ quotes: Map<string, Quote>; refreshed: Set<string> }> {
  const fxInstrument = createFxInstrument(ctx);
  const unique = uniqueInstruments(instruments.filter(hasInstrumentId));
  const cacheInstruments = uniqueInstruments([...unique, fxInstrument]);
  const cached = await getCachedQuotes(cacheInstruments, ctx);
  const toFetch = options.force
    ? unique
    : instrumentsNeedingRefresh(unique, cached);
  const refreshed = new Set<string>();

  if (toFetch.length === 0) {
    const fx = await loadFxRates(cached, ctx);
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
    const fxQuote = await fetchFrankfurterEurUsd(fxInstrument);
    results.set(quoteKey(fxInstrument), fxQuote);
  } catch (error) {
    console.error("Frankfurter FX fetch failed:", error);
  }

  const fx = await loadFxRates(results, ctx);

  const cryptoInstruments = toFetch.filter((instrument) =>
    isCryptoInstrument(instrument),
  );
  if (cryptoInstruments.length > 0) {
    try {
      const crypto = await fetchCoinGeckoQuotes(cryptoInstruments);
      for (const [key, quote] of crypto) {
        results.set(key, quote);
      }
    } catch (error) {
      console.error("CoinGecko fetch failed:", error);
    }
  }

  const etfQuotes = await fetchEtfQuotes(toFetch, ctx);
  for (const [key, quote] of etfQuotes) {
    results.set(key, quote);
  }

  const toFetchKeys = new Set(toFetch.map(quoteKey));
  const fetchedCount = [...results.entries()].filter(([key, quote]) => {
    if (!toFetchKeys.has(key)) return false;
    return quote.price > 0;
  }).length;

  if (
    fetchedCount === 0 &&
    toFetch.some(
      (instrument) =>
        !isCryptoInstrument(instrument) &&
        !isFxSymbol(instrument.symbol, ctx.fxSymbol),
    )
  ) {
    throw new Error("No quotes returned from market data providers");
  }

  applyPriceEur(results, fx);

  const toPersist = new Map<string, Quote>();
  for (const instrument of toFetch) {
    const key = quoteKey(instrument);
    const quote = results.get(key);
    if (quote && quote.price > 0) {
      toPersist.set(key, quote);
      refreshed.add(key);
    }
  }
  const fxKey = quoteKey(fxInstrument);
  if (results.has(fxKey)) {
    toPersist.set(fxKey, results.get(fxKey)!);
    refreshed.add(fxKey);
  }
  if (toPersist.size > 0) {
    await persistQuotes(toPersist);
    lastSuccessfulFetchAt = Date.now();
  }

  return { quotes: results, refreshed };
}

async function fetchAndCache(
  instruments: InstrumentRef[],
  options: { force?: boolean; bypassCooldown?: boolean } = {},
): Promise<{ quotes: Map<string, Quote>; refreshed: Set<string> }> {
  if (fetchInFlight) {
    return fetchInFlight;
  }

  fetchInFlight = (async () => {
    try {
      const ctx = await loadMarketContext();
      return await fetchAllQuotes(instruments, ctx, options);
    } finally {
      fetchInFlight = null;
    }
  })();

  return fetchInFlight;
}

export type GetQuotesOptions = {
  refresh?: boolean;
  force?: boolean;
  bypassCooldown?: boolean;
};

export async function refreshPortfolioQuotes(
  instruments: InstrumentRef[],
  options: Omit<GetQuotesOptions, "refresh"> = {},
): Promise<{ updated: InstrumentRef[]; skipped: InstrumentRef[] }> {
  const ctx = await loadMarketContext();
  const unique = uniqueInstruments(instruments.filter(hasInstrumentId));
  const cached = await getCachedQuotes(unique, ctx);
  const toFetch = options.force
    ? unique
    : instrumentsNeedingRefresh(unique, cached);

  if (toFetch.length === 0) {
    return { updated: [], skipped: unique };
  }

  await fetchAndCache(unique, {
    force: options.force,
    bypassCooldown: options.bypassCooldown ?? true,
  });

  const toFetchKeys = new Set(toFetch.map(quoteKey));
  return {
    updated: toFetch,
    skipped: unique.filter((instrument) => !toFetchKeys.has(quoteKey(instrument))),
  };
}

export async function getQuotes(
  instruments: InstrumentRef[],
  options: GetQuotesOptions = {},
): Promise<Quote[]> {
  const ctx = await loadMarketContext();
  const fxInstrument = createFxInstrument(ctx);
  const unique = uniqueInstruments(instruments.filter(hasInstrumentId));
  if (unique.length === 0) return [];

  const cacheInstruments = uniqueInstruments([...unique, fxInstrument]);
  const cached = await getCachedQuotes(cacheInstruments, ctx);

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
  for (const instrument of cacheInstruments) {
    const key = quoteKey(instrument);
    const quote = fresh.get(key) ?? cached.get(key);
    if (quote) {
      merged.set(key, {
        ...instrument,
        ...quote,
        stale: refreshed.has(key) ? false : (quote.stale ?? true),
      });
    }
  }

  applyPriceEur(merged, await loadFxRates(merged, ctx));

  return unique.map((instrument) => {
    const quote = merged.get(quoteKey(instrument));
    if (!quote) {
      return {
        ...instrument,
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
  instruments: InstrumentRef[],
  options: GetQuotesOptions = {},
): Promise<Map<string, Quote>> {
  const quotes = await getQuotes(instruments, options);
  return new Map(quotes.map((quote) => [quoteKey(quote), quote]));
}

export function hasMissingQuotes(quotes: Quote[]): boolean {
  return quotes.some((quote) => quote.price <= 0);
}

export function allQuotesStale(quotes: Quote[]): boolean {
  return quotes.length > 0 && quotes.every((quote) => quote.stale);
}

export type QuoteProvider = "yahoo" | "coingecko" | "frankfurter";

export function getQuoteProvider(
  instrument: InstrumentRef,
  ctx: MarketContext,
): QuoteProvider {
  if (isFxSymbol(instrument.symbol, ctx.fxSymbol)) return "frankfurter";
  if (isCryptoInstrument(instrument)) return "coingecko";
  return "yahoo";
}

async function fetchSingleQuote(
  instrument: InstrumentRef,
  ctx: MarketContext,
): Promise<Quote | null> {
  const normalized = normalizeInstrument(instrument);
  const provider = getQuoteProvider(normalized, ctx);
  let quote: Quote | null = null;

  if (provider === "frankfurter") {
    quote = await fetchFrankfurterEurUsd(createFxInstrument(ctx));
  } else if (provider === "coingecko") {
    const map = await fetchCoinGeckoQuotes([normalized]);
    quote = map.get(quoteKey(normalized)) ?? null;
  } else {
    const map = await fetchEtfQuotes([normalized], ctx);
    quote = map.get(quoteKey(normalized)) ?? null;
  }

  if (!quote || quote.price <= 0) return null;

  const results = new Map<string, Quote>([[quoteKey(normalized), quote]]);
  const fx = await loadFxRates(results, ctx);
  applyPriceEur(results, fx);
  const finalQuote = results.get(quoteKey(normalized))!;
  await persistQuotes(new Map([[quoteKey(normalized), finalQuote]]));
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
  instrument: InstrumentRef,
  options: { refresh?: boolean } = {},
): Promise<ProbeQuoteResult> {
  const ctx = await loadMarketContext();
  const normalized = normalizeInstrument(instrument);
  const provider = getQuoteProvider(normalized, ctx);

  if (options.refresh) {
    try {
      const quote = await fetchSingleQuote(normalized, ctx);
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

  const [quote] = await getQuotes([normalized], { refresh: false });
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

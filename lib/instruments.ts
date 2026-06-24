import type { Category, Position } from "./schema";

export type InstrumentRef = {
  isin: string | null;
  micCode: string | null;
  symbol: string | null;
  yahooSymbol: string | null;
  coingeckoId: string | null;
  category: Category | null;
};

export type Quote = InstrumentRef & {
  price: number;
  currency: string;
  priceEur: number;
  fetchedAt: Date;
  stale?: boolean;
};

export type MarketContext = {
  exchanges: Map<string, string>;
  fxSymbol: string;
};

/** Stable string key for quote maps. */
export function quoteKey(instrument: InstrumentRef): string {
  const normalized = normalizeInstrument(instrument);
  if (normalized.symbol) return normalized.symbol;
  if (!normalized.isin) return "";
  return normalized.micCode
    ? `${normalized.isin}:${normalized.micCode}`
    : normalized.isin;
}

/** ISIN or crypto/FX symbol stored in price_cache.isin column. */
export function cacheIsin(instrument: InstrumentRef): string {
  const normalized = normalizeInstrument(instrument);
  return normalized.symbol ?? normalized.isin ?? "";
}

/** MIC code stored in price_cache (empty string when not applicable). */
export function cacheMicCode(micCode: string | null | undefined): string {
  return micCode ?? "";
}

export function hasInstrumentId(instrument: InstrumentRef): boolean {
  const normalized = normalizeInstrument(instrument);
  return Boolean(normalized.symbol || normalized.isin);
}

export function normalizeInstrument(input: InstrumentRef): InstrumentRef {
  return {
    isin: input.isin?.trim().toUpperCase() || null,
    micCode: input.micCode?.trim().toUpperCase() || null,
    symbol: input.symbol?.trim().toUpperCase() || null,
    yahooSymbol: input.yahooSymbol?.trim() || null,
    coingeckoId: input.coingeckoId?.trim() || null,
    category: input.category,
  };
}

export function instrumentsEqual(a: InstrumentRef, b: InstrumentRef): boolean {
  return quoteKey(a) === quoteKey(b);
}

export function positionToInstrument(position: Position): InstrumentRef {
  if (position.category === "crypto") {
    return normalizeInstrument({
      isin: null,
      micCode: null,
      symbol: position.symbol,
      yahooSymbol: position.yahooSymbol,
      coingeckoId: position.coingeckoId,
      category: position.category,
    });
  }

  return normalizeInstrument({
    isin: position.isin,
    micCode: position.micCode,
    symbol: null,
    yahooSymbol: position.yahooSymbol,
    coingeckoId: position.coingeckoId,
    category: position.category,
  });
}

export function instrumentFromCacheRow(
  isin: string,
  micCode: string,
  ctx: MarketContext,
): InstrumentRef {
  const normalizedIsin = isin.trim().toUpperCase();
  const mic = micCode.trim().toUpperCase() || null;

  if (isFxSymbol(normalizedIsin, ctx.fxSymbol)) {
    return {
      isin: null,
      micCode: null,
      symbol: normalizedIsin,
      yahooSymbol: null,
      coingeckoId: null,
      category: null,
    };
  }

  if (isCryptoPairSymbol(normalizedIsin)) {
    return {
      isin: null,
      micCode: null,
      symbol: normalizedIsin,
      yahooSymbol: null,
      coingeckoId: null,
      category: "crypto",
    };
  }

  return {
    isin: normalizedIsin,
    micCode: mic,
    symbol: null,
    yahooSymbol: null,
    coingeckoId: null,
    category: null,
  };
}

export function isFxSymbol(
  symbol: string | null | undefined,
  fxSymbol: string,
): boolean {
  return symbol?.trim().toUpperCase() === fxSymbol.trim().toUpperCase();
}

export function isCryptoInstrument(instrument: InstrumentRef): boolean {
  return instrument.category === "crypto";
}

export function isCryptoPairSymbol(symbol: string | null | undefined): boolean {
  if (!symbol) return false;
  return /^[A-Z0-9]+-[A-Z]{3}$/.test(symbol.trim().toUpperCase());
}

export function toYahooSymbol(
  instrument: InstrumentRef,
  ctx: MarketContext,
): string {
  const normalized = normalizeInstrument(instrument);
  if (normalized.yahooSymbol) return normalized.yahooSymbol;

  if (normalized.isin && normalized.micCode) {
    const suffix = ctx.exchanges.get(normalized.micCode);
    if (suffix) return `${normalized.isin}.${suffix}`;
  }

  return normalized.symbol ?? normalized.isin ?? "";
}

export function instrumentFromQuery(
  params: {
    isin?: string | null;
    symbol?: string | null;
    micCode?: string | null;
    yahooSymbol?: string | null;
    coingeckoId?: string | null;
    category?: Category | null;
  },
  position?: Pick<
    Position,
    "isin" | "symbol" | "micCode" | "yahooSymbol" | "coingeckoId" | "category"
  > | null,
): InstrumentRef {
  const isin = params.isin?.trim() || position?.isin || null;
  const symbol = params.symbol?.trim() || position?.symbol || null;
  const micCode = params.micCode?.trim() || position?.micCode || null;
  const yahooSymbol = params.yahooSymbol?.trim() || position?.yahooSymbol || null;
  const coingeckoId = params.coingeckoId?.trim() || position?.coingeckoId || null;
  const category = params.category ?? position?.category ?? null;

  if (symbol) {
    return normalizeInstrument({
      isin: null,
      micCode: null,
      symbol,
      yahooSymbol,
      coingeckoId,
      category: category === "crypto" ? "crypto" : category,
    });
  }

  if (isin) {
    return normalizeInstrument({
      isin,
      micCode,
      symbol: null,
      yahooSymbol,
      coingeckoId,
      category,
    });
  }

  return normalizeInstrument({
    isin: null,
    micCode: null,
    symbol: null,
    yahooSymbol: null,
    coingeckoId: null,
    category: null,
  });
}

export function formatInstrumentLabel(instrument: InstrumentRef): string {
  const normalized = normalizeInstrument(instrument);
  if (normalized.symbol) return normalized.symbol;
  return normalized.micCode
    ? `${normalized.isin}:${normalized.micCode}`
    : (normalized.isin ?? "—");
}

export function createFxInstrument(ctx: MarketContext): InstrumentRef {
  return {
    isin: null,
    micCode: null,
    symbol: ctx.fxSymbol,
    yahooSymbol: null,
    coingeckoId: null,
    category: null,
  };
}

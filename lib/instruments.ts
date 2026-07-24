import type { Category, Position } from "./schema";

export type InstrumentRef = {
  isin: string | null;
  symbol: string | null;
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
  fxSymbol: string;
};

/** Stable string key for quote maps. */
export function quoteKey(instrument: InstrumentRef): string {
  const normalized = normalizeInstrument(instrument);
  if (normalized.symbol) return normalized.symbol;
  return normalized.isin ?? "";
}

/** Primary cache key (ISIN for ETFs, trading symbol for crypto/FX). */
export function cacheIsin(instrument: InstrumentRef): string {
  const normalized = normalizeInstrument(instrument);
  if (isCryptoInstrument(normalized)) {
    return normalized.symbol ?? "";
  }
  if (isEtfInstrument(normalized)) {
    return normalized.isin ?? "";
  }
  return normalized.symbol ?? normalized.isin ?? "";
}

/** Secondary cache key (Yahoo symbol for ETFs; empty otherwise). */
export function cacheQuoteSymbol(instrument: InstrumentRef): string {
  const normalized = normalizeInstrument(instrument);
  if (isEtfInstrument(normalized)) {
    return normalized.symbol ?? "";
  }
  return "";
}

export function hasInstrumentId(instrument: InstrumentRef): boolean {
  const normalized = normalizeInstrument(instrument);
  if (isCryptoInstrument(normalized)) {
    return Boolean(normalized.symbol);
  }
  if (isEtfInstrument(normalized)) {
    return Boolean(normalized.isin && normalized.symbol);
  }
  return Boolean(normalized.symbol || normalized.isin);
}

export function normalizeInstrument(input: InstrumentRef): InstrumentRef {
  return {
    isin: input.isin?.trim().toUpperCase() || null,
    symbol: input.symbol?.trim().toUpperCase() || null,
    coingeckoId: input.coingeckoId?.trim() || null,
    category: input.category,
  };
}

export function instrumentsEqual(a: InstrumentRef, b: InstrumentRef): boolean {
  return quoteKey(a) === quoteKey(b);
}

export function isEtfInstrument(instrument: InstrumentRef): boolean {
  if (
    instrument.category === "equity_etf" ||
    instrument.category === "bond_etf"
  ) {
    return true;
  }
  return Boolean(
    instrument.isin &&
      instrument.symbol &&
      !isCryptoInstrument(instrument),
  );
}

export function positionToInstrument(position: Position): InstrumentRef {
  return normalizeInstrument({
    isin: position.category === "crypto" ? null : position.isin,
    symbol: position.symbol,
    coingeckoId: position.coingeckoId,
    category: position.category,
  });
}

export function instrumentFromCacheRow(
  isin: string,
  quoteSymbol: string,
  ctx: MarketContext,
): InstrumentRef {
  const normalizedIsin = isin.trim().toUpperCase();
  const symbol = quoteSymbol.trim().toUpperCase() || null;

  if (isFxSymbol(normalizedIsin, ctx.fxSymbol)) {
    return {
      isin: null,
      symbol: normalizedIsin,
      coingeckoId: null,
      category: null,
    };
  }

  if (isCryptoPairSymbol(normalizedIsin)) {
    return {
      isin: null,
      symbol: normalizedIsin,
      coingeckoId: null,
      category: "crypto",
    };
  }

  if (symbol) {
    return {
      isin: normalizedIsin,
      symbol,
      coingeckoId: null,
      category: null,
    };
  }

  return {
    isin: normalizedIsin,
    symbol: null,
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

export function toYahooSymbol(instrument: InstrumentRef): string {
  const normalized = normalizeInstrument(instrument);
  return normalized.symbol ?? "";
}

export function instrumentFromQuery(
  params: {
    isin?: string | null;
    symbol?: string | null;
    coingeckoId?: string | null;
    category?: Category | null;
  },
  position?: Pick<
    Position,
    "isin" | "symbol" | "coingeckoId" | "category"
  > | null,
): InstrumentRef {
  const isin = params.isin?.trim() || position?.isin || null;
  const symbol = params.symbol?.trim() || position?.symbol || null;
  const coingeckoId = params.coingeckoId?.trim() || position?.coingeckoId || null;
  const category = params.category ?? position?.category ?? null;

  if (category === "crypto" || (!isin && symbol)) {
    return normalizeInstrument({
      isin: null,
      symbol,
      coingeckoId,
      category: category === "crypto" ? "crypto" : category,
    });
  }

  if (isin) {
    return normalizeInstrument({
      isin,
      symbol,
      coingeckoId,
      category,
    });
  }

  return normalizeInstrument({
    isin: null,
    symbol: null,
    coingeckoId: null,
    category: null,
  });
}

export function formatInstrumentLabel(instrument: InstrumentRef): string {
  const normalized = normalizeInstrument(instrument);
  if (normalized.isin && normalized.symbol) {
    return `${normalized.isin} (${normalized.symbol})`;
  }
  return normalized.symbol ?? normalized.isin ?? "—";
}

export function createFxInstrument(ctx: MarketContext): InstrumentRef {
  return {
    isin: null,
    symbol: ctx.fxSymbol,
    coingeckoId: null,
    category: null,
  };
}

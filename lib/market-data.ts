import { eq } from "drizzle-orm";
import { getDb } from "./db";
import type { MarketContext } from "./instruments";
import { exchanges, quoteSources } from "./schema";

const FX_SOURCE_ID = "fx_eurusd";

let cachedContext: MarketContext | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000;

export async function loadMarketContext(
  options: { refresh?: boolean } = {},
): Promise<MarketContext> {
  const now = Date.now();
  if (!options.refresh && cachedContext && now - cachedAt < CACHE_TTL_MS) {
    return cachedContext;
  }

  const db = getDb();
  const [exchangeRows, fxRows] = await Promise.all([
    db.select().from(exchanges),
    db.select().from(quoteSources).where(eq(quoteSources.id, FX_SOURCE_ID)).limit(1),
  ]);

  const fxSymbol = fxRows[0]?.symbol;
  if (!fxSymbol) {
    throw new Error(
      `Missing quote_sources row "${FX_SOURCE_ID}". Run db:seed.`,
    );
  }

  cachedContext = {
    exchanges: new Map(
      exchangeRows.map((row) => [row.micCode.toUpperCase(), row.yahooSuffix]),
    ),
    fxSymbol: fxSymbol.toUpperCase(),
  };
  cachedAt = now;
  return cachedContext;
}

export function clearMarketContextCache(): void {
  cachedContext = null;
  cachedAt = 0;
}

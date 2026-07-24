import { eq } from "drizzle-orm";
import { getDb } from "./db";
import type { MarketContext } from "./instruments";
import { quoteSources } from "./schema";

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
  const [fxRow] = await db
    .select()
    .from(quoteSources)
    .where(eq(quoteSources.id, FX_SOURCE_ID))
    .limit(1);

  const fxSymbol = fxRow?.symbol;
  if (!fxSymbol) {
    throw new Error(
      `Missing quote_sources row "${FX_SOURCE_ID}". Run npm run db:seed.`,
    );
  }

  cachedContext = {
    fxSymbol: fxSymbol.toUpperCase(),
  };
  cachedAt = now;
  return cachedContext;
}

export function clearMarketContextCache(): void {
  cachedContext = null;
  cachedAt = 0;
}

import { and, eq, inArray, or } from "drizzle-orm";
import { getPortfolioContext } from "./auth";
import { getDb } from "./db";
import {
  cacheIsin,
  cacheMicCode,
  hasInstrumentId,
  normalizeInstrument,
  positionToInstrument,
  quoteKey,
  type InstrumentRef,
} from "./instruments";
import { getQuoteMap, hasMissingQuotes, type Quote } from "./prices";
import { positions, priceCache } from "./schema";

export type RefreshQuotesResult = {
  quotes: Map<string, Quote>;
  refreshed: number;
  skipped: number;
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

export async function refreshAllPositionQuotes(): Promise<RefreshQuotesResult> {
  const portfolioIds = await resolvePortfolioIds();
  const db = getDb();
  const rows = await db
    .select()
    .from(positions)
    .where(inArray(positions.portfolioId, portfolioIds));
  const instruments = rows.map(positionToInstrument);

  const quotes = await getQuoteMap(instruments, {
    refresh: true,
    bypassCooldown: true,
  });

  let refreshed = 0;
  for (const quote of quotes.values()) {
    if (quote.price > 0 && !quote.stale) refreshed++;
  }

  return {
    quotes,
    refreshed,
    skipped: instruments.length - refreshed,
  };
}

export function quotesRefreshFailed(quotes: Map<string, Quote>): boolean {
  return hasMissingQuotes([...quotes.values()]);
}

function uniquePositionInstruments(
  instruments: InstrumentRef[],
): InstrumentRef[] {
  const seen = new Set<string>();
  const unique: InstrumentRef[] = [];
  for (const instrument of instruments) {
    const normalized = normalizeInstrument(instrument);
    const key = quoteKey(normalized);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(normalized);
  }
  return unique;
}

/** Latest market-data fetch time across current portfolio positions. */
export async function getLastQuoteRefreshAt(): Promise<Date | null> {
  const portfolioIds = await resolvePortfolioIds();
  const db = getDb();
  const posRows = await db
    .select()
    .from(positions)
    .where(inArray(positions.portfolioId, portfolioIds));
  const instruments = uniquePositionInstruments(
    posRows.map(positionToInstrument).filter(hasInstrumentId),
  );
  if (instruments.length === 0) return null;

  const rows = await db
    .select({ fetchedAt: priceCache.fetchedAt })
    .from(priceCache)
    .where(
      or(
        ...instruments.map((instrument) =>
          and(
            eq(priceCache.isin, cacheIsin(instrument)),
            eq(priceCache.micCode, cacheMicCode(instrument.micCode)),
          ),
        ),
      ),
    );

  if (rows.length === 0) return null;

  return rows.reduce(
    (latest, row) => (row.fetchedAt > latest ? row.fetchedAt : latest),
    rows[0].fetchedAt,
  );
}

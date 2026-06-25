import { computePortfolio } from "./calculations";
import { getDb } from "./db";
import { getQuoteMap, hasMissingQuotes } from "./prices";
import { positionToInstrument } from "./instruments";
import { dailySnapshots, positions } from "./schema";

export function getRomeDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function getPositionsValueEur(refresh = true) {
  const db = getDb();
  const posRows = await db
    .select()
    .from(positions)
    .orderBy(positions.sortOrder);

  const instruments = posRows.map(positionToInstrument);
  let quotes = await getQuoteMap(instruments, {
    refresh,
    bypassCooldown: refresh,
  });
  if (hasMissingQuotes([...quotes.values()])) {
    quotes = await getQuoteMap(instruments, { refresh: false });
  }
  const { totals } = computePortfolio(posRows, [], quotes, false);
  return totals.positionsValueEur;
}

export async function captureSnapshot() {
  const db = getDb();
  const date = getRomeDate();
  const positionsValueEur = await getPositionsValueEur(true);

  await db
    .insert(dailySnapshots)
    .values({
      date,
      positionsValueEur: String(positionsValueEur),
    })
    .onConflictDoUpdate({
      target: dailySnapshots.date,
      set: {
        positionsValueEur: String(positionsValueEur),
        capturedAt: new Date(),
      },
    });

  return { date, positionsValueEur };
}

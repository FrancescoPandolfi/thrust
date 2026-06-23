import { and, desc, eq } from "drizzle-orm";
import { computePortfolio } from "./calculations";
import { getDb } from "./db";
import { getQuoteMap, hasMissingQuotes } from "./prices";
import {
  cashBalances,
  dailyReturns,
  dailySnapshots,
  positions,
  type SnapshotType,
} from "./schema";

export function getRomeDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function getCurrentPortfolioValues() {
  const db = getDb();
  const [posRows, cashRows] = await Promise.all([
    db.select().from(positions).orderBy(positions.sortOrder),
    db.select().from(cashBalances),
  ]);

  const symbols = posRows.map((p) => p.yahooSymbol);
  let quotes = await getQuoteMap(symbols, { refresh: true });
  if (hasMissingQuotes([...quotes.values()])) {
    quotes = await getQuoteMap(symbols, { refresh: false });
  }
  const { totals } = computePortfolio(posRows, cashRows, quotes, true);

  return {
    totalValueEur: totals.totalValueEur,
    positionsValueEur: totals.positionsValueEur,
    cashValueEur: totals.cashValueEur,
  };
}

export async function captureSnapshot(type: SnapshotType) {
  const db = getDb();
  const date = getRomeDate();
  const values = await getCurrentPortfolioValues();

  await db
    .insert(dailySnapshots)
    .values({
      date,
      type,
      totalValueEur: String(values.totalValueEur),
      positionsValueEur: String(values.positionsValueEur),
      cashValueEur: String(values.cashValueEur),
    })
    .onConflictDoUpdate({
      target: [dailySnapshots.date, dailySnapshots.type],
      set: {
        totalValueEur: String(values.totalValueEur),
        positionsValueEur: String(values.positionsValueEur),
        cashValueEur: String(values.cashValueEur),
        capturedAt: new Date(),
      },
    });

  if (type === "close") {
    await computeDailyReturn(date);
  }

  return { date, type, ...values };
}

export async function computeDailyReturn(date: string) {
  const db = getDb();

  const [openSnap] = await db
    .select()
    .from(dailySnapshots)
    .where(and(eq(dailySnapshots.date, date), eq(dailySnapshots.type, "open")))
    .limit(1);

  const [closeSnap] = await db
    .select()
    .from(dailySnapshots)
    .where(and(eq(dailySnapshots.date, date), eq(dailySnapshots.type, "close")))
    .limit(1);

  if (!closeSnap) return null;

  let startValue = openSnap
    ? Number.parseFloat(openSnap.totalValueEur)
    : null;

  if (startValue == null) {
    const [prevClose] = await db
      .select()
      .from(dailySnapshots)
      .where(eq(dailySnapshots.type, "close"))
      .orderBy(desc(dailySnapshots.date))
      .limit(1);
    startValue = prevClose
      ? Number.parseFloat(prevClose.totalValueEur)
      : Number.parseFloat(closeSnap.totalValueEur);
  }

  const endValue = Number.parseFloat(closeSnap.totalValueEur);
  const returnEur = endValue - startValue;
  const returnPct = startValue > 0 ? endValue / startValue - 1 : 0;

  await db
    .insert(dailyReturns)
    .values({
      date,
      startValueEur: String(startValue),
      endValueEur: String(endValue),
      returnEur: String(returnEur),
      returnPct: String(returnPct),
    })
    .onConflictDoUpdate({
      target: dailyReturns.date,
      set: {
        startValueEur: String(startValue),
        endValueEur: String(endValue),
        returnEur: String(returnEur),
        returnPct: String(returnPct),
        computedAt: new Date(),
      },
    });

  return { date, startValue, endValue, returnEur, returnPct };
}

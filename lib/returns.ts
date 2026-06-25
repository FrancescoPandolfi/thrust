import { and, asc, desc, eq, gt, gte, lt, lte } from "drizzle-orm";
import { addDays, format, parseISO, startOfWeek, subDays } from "date-fns";
import { getPositionsValueEur, getRomeDate } from "./snapshots";
import { getDb } from "./db";
import { dailySnapshots } from "./schema";

function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number.parseFloat(v);
}

export type DailyReturnRow = {
  date: string;
  startValueEur: number;
  endValueEur: number;
  returnEur: number;
  returnPct: number;
};

export type WeeklyReturnRow = {
  week: string;
  returnEur: number;
  returnPct: number;
};

export type ChartPoint = {
  date: string;
  positionsValueEur: number;
};

function defaultFromDate(): string {
  return format(subDays(new Date(), 90), "yyyy-MM-dd");
}

function computeDailyReturnRow(
  date: string,
  startValueEur: number,
  endValueEur: number,
): DailyReturnRow {
  const returnEur = endValueEur - startValueEur;
  const returnPct = startValueEur > 0 ? endValueEur / startValueEur - 1 : 0;
  return { date, startValueEur, endValueEur, returnEur, returnPct };
}

async function getSnapshotForDate(date: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(dailySnapshots)
    .where(eq(dailySnapshots.date, date))
    .limit(1);
  return row ?? null;
}

async function getPreviousSnapshot(beforeDate: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(dailySnapshots)
    .where(lt(dailySnapshots.date, beforeDate))
    .orderBy(desc(dailySnapshots.date))
    .limit(1);
  return row ?? null;
}

async function getNextSnapshot(afterDate: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(dailySnapshots)
    .where(gt(dailySnapshots.date, afterDate))
    .orderBy(asc(dailySnapshots.date))
    .limit(1);
  return row ?? null;
}

export async function getDailyReturns(
  from?: string,
  to?: string,
): Promise<DailyReturnRow[]> {
  const db = getDb();
  const fromDate = from ?? defaultFromDate();
  const toDate = to ?? getRomeDate();
  const snapshotThrough = format(addDays(parseISO(toDate), 1), "yyyy-MM-dd");

  const rows = await db
    .select()
    .from(dailySnapshots)
    .where(
      and(
        gte(dailySnapshots.date, fromDate),
        lte(dailySnapshots.date, snapshotThrough),
      ),
    )
    .orderBy(asc(dailySnapshots.date));

  const returns: DailyReturnRow[] = [];
  for (let i = 0; i < rows.length - 1; i++) {
    const startSnap = rows[i];
    const endSnap = rows[i + 1];
    if (startSnap.date < fromDate || startSnap.date > toDate) continue;

    returns.push(
      computeDailyReturnRow(
        startSnap.date,
        toNum(startSnap.positionsValueEur),
        toNum(endSnap.positionsValueEur),
      ),
    );
  }

  return returns.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getWeeklyReturns(
  from?: string,
  to?: string,
): Promise<WeeklyReturnRow[]> {
  const daily = await getDailyReturns(from, to);
  const byWeek = new Map<string, DailyReturnRow[]>();

  for (const row of daily) {
    const weekStart = format(
      startOfWeek(new Date(row.date), { weekStartsOn: 1 }),
      "yyyy-MM-dd",
    );
    const group = byWeek.get(weekStart) ?? [];
    group.push(row);
    byWeek.set(weekStart, group);
  }

  return [...byWeek.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([week, rows]) => {
      const returnEur = rows.reduce((s, r) => s + r.returnEur, 0);
      const returnPct = rows.reduce((acc, r) => acc * (1 + r.returnPct), 1) - 1;
      return { week, returnEur, returnPct };
    });
}

export async function getSnapshotsForChart(
  from?: string,
  to?: string,
): Promise<ChartPoint[]> {
  const db = getDb();
  const fromDate = from ?? defaultFromDate();
  const toDate = to ?? getRomeDate();

  const rows = await db
    .select()
    .from(dailySnapshots)
    .where(
      and(
        gte(dailySnapshots.date, fromDate),
        lte(dailySnapshots.date, toDate),
      ),
    )
    .orderBy(dailySnapshots.date);

  return rows.map((row) => ({
    date: row.date,
    positionsValueEur: toNum(row.positionsValueEur),
  }));
}

export async function getTodaySummary() {
  const today = getRomeDate();

  const todaySnap = await getSnapshotForDate(today);
  const prevSnap = await getPreviousSnapshot(today);
  const nextSnap = await getNextSnapshot(today);

  let liveValue: number | null = null;
  try {
    liveValue = await getPositionsValueEur(false);
  } catch {
    liveValue = null;
  }

  const startValue = todaySnap
    ? toNum(todaySnap.positionsValueEur)
    : prevSnap
      ? toNum(prevSnap.positionsValueEur)
      : null;
  const endValue = liveValue;

  let returnEur: number | null = null;
  let returnPct: number | null = null;
  if (startValue != null && endValue != null) {
    returnEur = endValue - startValue;
    returnPct = startValue > 0 ? endValue / startValue - 1 : 0;
  }

  return {
    date: today,
    startValueEur: startValue,
    endValueEur: endValue,
    returnEur,
    returnPct,
    inProgress: nextSnap == null,
  };
}

import { and, desc, eq, gte, lte } from "drizzle-orm";
import { format, startOfWeek, subDays } from "date-fns";
import { getCurrentPortfolioValues, getRomeDate } from "./snapshots";
import { getDb } from "./db";
import { dailyReturns, dailySnapshots } from "./schema";

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
  totalValueEur: number;
};

function defaultFromDate(): string {
  return format(subDays(new Date(), 90), "yyyy-MM-dd");
}

export async function getDailyReturns(
  from?: string,
  to?: string,
): Promise<DailyReturnRow[]> {
  const db = getDb();
  const fromDate = from ?? defaultFromDate();
  const toDate = to ?? getRomeDate();

  const rows = await db
    .select()
    .from(dailyReturns)
    .where(
      and(gte(dailyReturns.date, fromDate), lte(dailyReturns.date, toDate)),
    )
    .orderBy(desc(dailyReturns.date));

  return rows.map((r) => ({
    date: r.date,
    startValueEur: toNum(r.startValueEur),
    endValueEur: toNum(r.endValueEur),
    returnEur: toNum(r.returnEur),
    returnPct: toNum(r.returnPct),
  }));
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

export async function getCloseSnapshotsForChart(
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
        eq(dailySnapshots.type, "close"),
        gte(dailySnapshots.date, fromDate),
        lte(dailySnapshots.date, toDate),
      ),
    )
    .orderBy(dailySnapshots.date);

  return rows.map((r) => ({
    date: r.date,
    totalValueEur: toNum(r.totalValueEur),
  }));
}

export async function getTodaySummary() {
  const db = getDb();
  const today = getRomeDate();

  const [openSnap] = await db
    .select()
    .from(dailySnapshots)
    .where(and(eq(dailySnapshots.date, today), eq(dailySnapshots.type, "open")))
    .limit(1);

  const [closeSnap] = await db
    .select()
    .from(dailySnapshots)
    .where(and(eq(dailySnapshots.date, today), eq(dailySnapshots.type, "close")))
    .limit(1);

  const [todayReturn] = await db
    .select()
    .from(dailyReturns)
    .where(eq(dailyReturns.date, today))
    .limit(1);

  let liveValue: number | null = null;
  if (!closeSnap) {
    try {
      const live = await getCurrentPortfolioValues();
      liveValue = live.totalValueEur;
    } catch {
      liveValue = null;
    }
  }

  const startValue = openSnap ? toNum(openSnap.totalValueEur) : null;
  const endValue = closeSnap
    ? toNum(closeSnap.totalValueEur)
    : liveValue;

  let returnEur: number | null = todayReturn ? toNum(todayReturn.returnEur) : null;
  let returnPct: number | null = todayReturn ? toNum(todayReturn.returnPct) : null;

  if (returnEur == null && startValue != null && endValue != null) {
    returnEur = endValue - startValue;
    returnPct = startValue > 0 ? endValue / startValue - 1 : 0;
  }

  return {
    date: today,
    startValueEur: startValue,
    endValueEur: endValue,
    returnEur,
    returnPct,
    inProgress: !closeSnap,
  };
}

import { and, asc, desc, eq, gt, gte, inArray, lt, lte } from "drizzle-orm";
import {
  addDays,
  formatIsoDate,
  parseIsoDate,
  startOfWeek,
  subDays,
} from "./dates";
import { getNetFlowsByDate } from "./capital-flows";
import { getPortfolioContext } from "./auth";
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
  return formatIsoDate(subDays(new Date(), 90));
}

function computeDailyReturnRow(
  date: string,
  startValueEur: number,
  endValueEur: number,
  netFlowEur = 0,
): DailyReturnRow {
  const returnEur = endValueEur - startValueEur - netFlowEur;
  const returnPct = startValueEur > 0 ? returnEur / startValueEur : 0;
  return { date, startValueEur, endValueEur, returnEur, returnPct };
}

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

async function getSnapshotRowsForDate(date: string, portfolioIds: string[]) {
  const db = getDb();
  return db
    .select()
    .from(dailySnapshots)
    .where(
      and(
        eq(dailySnapshots.date, date),
        inArray(dailySnapshots.portfolioId, portfolioIds),
      ),
    );
}

/** Opening value for a day: sum today's snapshots; portfolios without a row count as 0. */
async function getOpeningValueEur(
  date: string,
  portfolioIds: string[],
): Promise<number | null> {
  const rows = await getSnapshotRowsForDate(date, portfolioIds);
  if (rows.length === 0) return null;

  const byPortfolio = new Map(
    rows.map((row) => [row.portfolioId, toNum(row.positionsValueEur)]),
  );
  let total = 0;
  for (const id of portfolioIds) {
    total += byPortfolio.get(id) ?? 0;
  }
  return total;
}

async function getPreviousSnapshot(beforeDate: string, portfolioIds: string[]) {
  const db = getDb();
  const rows = await db
    .select()
    .from(dailySnapshots)
    .where(
      and(
        lt(dailySnapshots.date, beforeDate),
        inArray(dailySnapshots.portfolioId, portfolioIds),
      ),
    )
    .orderBy(desc(dailySnapshots.date));

  if (rows.length === 0) return null;

  const latestDate = rows[0].date;
  const sameDayRows = rows.filter((row) => row.date === latestDate);
  const total = sameDayRows.reduce(
    (sum, row) => sum + toNum(row.positionsValueEur),
    0,
  );
  return { date: latestDate, positionsValueEur: total };
}

async function getNextSnapshot(afterDate: string, portfolioIds: string[]) {
  const db = getDb();
  const rows = await db
    .select()
    .from(dailySnapshots)
    .where(
      and(
        gt(dailySnapshots.date, afterDate),
        inArray(dailySnapshots.portfolioId, portfolioIds),
      ),
    )
    .orderBy(asc(dailySnapshots.date));

  if (rows.length === 0) return null;

  const earliestDate = rows[0].date;
  const sameDayRows = rows.filter((row) => row.date === earliestDate);
  const total = sameDayRows.reduce(
    (sum, row) => sum + toNum(row.positionsValueEur),
    0,
  );
  return { date: earliestDate, positionsValueEur: total };
}

async function getAggregatedSnapshotSeries(
  fromDate: string,
  toDate: string,
  portfolioIds: string[],
) {
  const db = getDb();
  const rows = await db
    .select()
    .from(dailySnapshots)
    .where(
      and(
        gte(dailySnapshots.date, fromDate),
        lte(dailySnapshots.date, toDate),
        inArray(dailySnapshots.portfolioId, portfolioIds),
      ),
    )
    .orderBy(asc(dailySnapshots.date));

  const byDate = new Map<string, number>();
  for (const row of rows) {
    byDate.set(
      row.date,
      (byDate.get(row.date) ?? 0) + toNum(row.positionsValueEur),
    );
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, positionsValueEur]) => ({ date, positionsValueEur }));
}

export async function getDailyReturns(
  from?: string,
  to?: string,
): Promise<DailyReturnRow[]> {
  const portfolioIds = await resolvePortfolioIds();
  const fromDate = from ?? defaultFromDate();
  const toDate = to ?? getRomeDate();
  const snapshotThrough = formatIsoDate(addDays(parseIsoDate(toDate), 1));

  const rows = await getAggregatedSnapshotSeries(
    fromDate,
    snapshotThrough,
    portfolioIds,
  );

  const flowsByDate = await getNetFlowsByDate(fromDate, toDate, portfolioIds);

  const returns: DailyReturnRow[] = [];
  for (let i = 0; i < rows.length - 1; i++) {
    const startSnap = rows[i];
    const endSnap = rows[i + 1];
    if (startSnap.date < fromDate || startSnap.date > toDate) continue;

    returns.push(
      computeDailyReturnRow(
        startSnap.date,
        startSnap.positionsValueEur,
        endSnap.positionsValueEur,
        flowsByDate.get(startSnap.date) ?? 0,
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
    const weekStart = formatIsoDate(
      startOfWeek(parseIsoDate(row.date), 1),
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
  const portfolioIds = await resolvePortfolioIds();
  const fromDate = from ?? defaultFromDate();
  const toDate = to ?? getRomeDate();

  const rows = await getAggregatedSnapshotSeries(fromDate, toDate, portfolioIds);
  return rows.map((row) => ({
    date: row.date,
    positionsValueEur: row.positionsValueEur,
  }));
}

export async function getTodaySummary() {
  const portfolioIds = await resolvePortfolioIds();
  const today = getRomeDate();

  const nextSnap = await getNextSnapshot(today, portfolioIds);

  let liveValue: number | null = null;
  try {
    liveValue = await getPositionsValueEur(false, portfolioIds);
  } catch {
    liveValue = null;
  }

  // Opening value comes from today's midnight snapshot only. Falling back to an
  // older snapshot would measure multiple days, not today's return.
  const startValue = await getOpeningValueEur(today, portfolioIds);
  const endValue = liveValue;

  let returnEur: number | null = null;
  let returnPct: number | null = null;
  if (startValue != null && endValue != null) {
    const flowsByDate = await getNetFlowsByDate(today, today, portfolioIds);
    const netFlowEur = flowsByDate.get(today) ?? 0;
    returnEur = endValue - startValue - netFlowEur;
    returnPct = startValue > 0 ? returnEur / startValue : 0;
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

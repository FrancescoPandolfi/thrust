import { and, desc, gte, lte } from "drizzle-orm";
import { getDb } from "./db";
import { formatSharesForStorage } from "./format";
import { capitalFlows } from "./schema";
import { getRomeDate } from "./snapshots";

function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number.parseFloat(v);
}

export type CapitalFlowRow = {
  id: string;
  date: string;
  amountEur: number;
  title: string | null;
  sharesDelta: number | null;
  createdAt: Date;
};

export type CapitalFlowMonthRow = {
  month: string;
  label: string;
  netEur: number;
  inEur: number;
  outEur: number;
};

export type RecordCapitalFlowInput = {
  amountEur: number;
  positionId?: string;
  title?: string;
  sharesDelta?: number;
};

export async function recordCapitalFlow(input: RecordCapitalFlowInput) {
  const { amountEur, positionId, title, sharesDelta } = input;
  if (amountEur === 0) return;

  const db = getDb();
  await db.insert(capitalFlows).values({
    date: getRomeDate(),
    amountEur: String(amountEur),
    positionId: positionId ?? null,
    title: title ?? null,
    sharesDelta:
      sharesDelta != null && sharesDelta !== 0
        ? formatSharesForStorage(sharesDelta)
        : null,
  });
}

export async function getNetFlowsByDate(
  from: string,
  to: string,
): Promise<Map<string, number>> {
  const db = getDb();
  const rows = await db
    .select({
      date: capitalFlows.date,
      amountEur: capitalFlows.amountEur,
    })
    .from(capitalFlows)
    .where(and(gte(capitalFlows.date, from), lte(capitalFlows.date, to)));

  const byDate = new Map<string, number>();
  for (const row of rows) {
    const date = String(row.date);
    byDate.set(date, (byDate.get(date) ?? 0) + toNum(row.amountEur));
  }
  return byDate;
}

export async function getCapitalFlowsByMonth(): Promise<CapitalFlowMonthRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      date: capitalFlows.date,
      amountEur: capitalFlows.amountEur,
    })
    .from(capitalFlows)
    .orderBy(capitalFlows.date);

  const byMonth = new Map<string, { inEur: number; outEur: number }>();
  for (const row of rows) {
    const month = String(row.date).slice(0, 7);
    const amount = toNum(row.amountEur);
    const bucket = byMonth.get(month) ?? { inEur: 0, outEur: 0 };
    if (amount >= 0) {
      bucket.inEur += amount;
    } else {
      bucket.outEur += Math.abs(amount);
    }
    byMonth.set(month, bucket);
  }

  const monthFormatter = new Intl.DateTimeFormat("it-IT", {
    month: "short",
    year: "numeric",
  });

  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { inEur, outEur }]) => {
      const [year, m] = month.split("-").map(Number);
      return {
        month,
        label: monthFormatter.format(new Date(year, m - 1, 1)),
        inEur,
        outEur,
        netEur: inEur - outEur,
      };
    });
}

export async function getCapitalFlows(limit = 200): Promise<CapitalFlowRow[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(capitalFlows)
    .orderBy(desc(capitalFlows.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    date: String(row.date),
    amountEur: toNum(row.amountEur),
    title: row.title,
    sharesDelta: row.sharesDelta != null ? toNum(row.sharesDelta) : null,
    createdAt: row.createdAt,
  }));
}

import { formatDate, formatEur, formatMonthYear, formatPct } from "@/lib/format";
import type {
  DailyReturnRow,
  MonthlyReturnRow,
  WeeklyReturnRow,
} from "@/lib/returns";

type Period = "daily" | "weekly" | "monthly";

type Props = {
  period: Period;
  daily: DailyReturnRow[];
  weekly: WeeklyReturnRow[];
  monthly: MonthlyReturnRow[];
  embedded?: boolean;
};

type TableRow = {
  key: string;
  label: string;
  startValueEur: number;
  endValueEur: number;
  returnEur: number;
  returnPct: number;
};

function rowsForPeriod(
  period: Period,
  daily: DailyReturnRow[],
  weekly: WeeklyReturnRow[],
  monthly: MonthlyReturnRow[],
): TableRow[] {
  switch (period) {
    case "daily":
      return daily.map((row) => ({
        key: row.date,
        label: formatDate(row.date),
        startValueEur: row.startValueEur,
        endValueEur: row.endValueEur,
        returnEur: row.returnEur,
        returnPct: row.returnPct,
      }));
    case "weekly":
      return weekly.map((row) => ({
        key: row.week,
        label: formatDate(row.week),
        startValueEur: row.startValueEur,
        endValueEur: row.endValueEur,
        returnEur: row.returnEur,
        returnPct: row.returnPct,
      }));
    case "monthly":
      return monthly.map((row) => ({
        key: row.month,
        label: formatMonthYear(row.month),
        startValueEur: row.startValueEur,
        endValueEur: row.endValueEur,
        returnEur: row.returnEur,
        returnPct: row.returnPct,
      }));
    default: {
      const _exhaustive: never = period;
      return _exhaustive;
    }
  }
}

function periodColumnLabel(period: Period): string {
  switch (period) {
    case "daily":
      return "Date";
    case "weekly":
      return "Week";
    case "monthly":
      return "Month";
    default: {
      const _exhaustive: never = period;
      return _exhaustive;
    }
  }
}

export function ReturnsTable({
  period,
  daily,
  weekly,
  monthly,
  embedded = false,
}: Props) {
  const rows = rowsForPeriod(period, daily, weekly, monthly);

  if (rows.length === 0) {
    return (
      <div
        className={
          embedded
            ? "p-8 text-center text-sm text-zinc-400"
            : "rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-400"
        }
      >
        No return history yet. A daily snapshot runs at midnight (Europe/Rome).
      </div>
    );
  }

  return (
    <div className={embedded ? "" : "overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-3">{periodColumnLabel(period)}</th>
              <th className="px-4 py-3 text-right">Start value</th>
              <th className="px-4 py-3 text-right">End value</th>
              <th className="px-4 py-3 text-right">Δ EUR</th>
              <th className="px-4 py-3 text-right">Δ %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const positive = row.returnEur >= 0;
              return (
                <tr
                  key={row.key}
                  className="border-b border-zinc-800/60 even:bg-zinc-900/50"
                >
                  <td className="px-4 py-2.5 font-mono text-zinc-300">
                    {row.label}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-zinc-400">
                    {formatEur(row.startValueEur)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-zinc-200">
                    {formatEur(row.endValueEur)}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-mono tabular-nums ${
                      positive ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {positive ? "+" : ""}
                    {formatEur(row.returnEur)}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-mono tabular-nums ${
                      positive ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {positive ? "+" : ""}
                    {formatPct(row.returnPct)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

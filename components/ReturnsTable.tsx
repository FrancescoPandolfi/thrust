import { formatEur, formatPct } from "@/lib/format";
import type { DailyReturnRow } from "@/lib/returns";

type Props = {
  rows: DailyReturnRow[];
};

export function ReturnsTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-400">
        No return history yet. Snapshots are captured daily at open and close.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-3">Date</th>
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
                  key={row.date}
                  className="border-b border-zinc-800/60 even:bg-zinc-900/50"
                >
                  <td className="px-4 py-2.5 font-mono text-zinc-300">
                    {row.date}
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

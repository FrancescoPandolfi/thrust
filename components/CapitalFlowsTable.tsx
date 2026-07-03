import { formatDate, formatDateTime, formatEur, formatNumber, SHARES_DECIMALS } from "@/lib/format";
import type { CapitalFlowRow } from "@/lib/capital-flows";

type Props = {
  rows: CapitalFlowRow[];
};

export function CapitalFlowsTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-400">
        No capital flows yet. Flows are recorded when you buy or sell via the
        position editor.
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
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3 text-right">Shares</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="hidden px-4 py-3 text-right sm:table-cell">Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const positive = row.amountEur >= 0;
              return (
                <tr
                  key={row.id}
                  className="border-b border-zinc-800/60 even:bg-zinc-900/50"
                >
                  <td className="px-4 py-2.5 font-mono text-zinc-300">
                    {formatDate(row.date)}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-200">
                    {row.title ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-zinc-400">
                    {row.sharesDelta != null ? (
                      <>
                        {row.sharesDelta >= 0 ? "+" : ""}
                        {formatNumber(row.sharesDelta, SHARES_DECIMALS)}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-mono tabular-nums ${
                      positive ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {positive ? "+" : ""}
                    {formatEur(row.amountEur)}
                  </td>
                  <td className="hidden px-4 py-2.5 text-right font-mono text-xs tabular-nums text-zinc-500 sm:table-cell">
                    {formatDateTime(row.createdAt)}
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

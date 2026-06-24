"use client";

import { Fragment, useState } from "react";
import type { ComputedPosition } from "@/lib/calculations";
import { CATEGORY_LABELS, groupByCategory } from "@/lib/calculations";
import { formatEur, formatPct } from "@/lib/format";
import { PositionEditModal } from "./PositionEditModal";
import { PositionRow } from "./PositionRow";

type Props = {
  positions: ComputedPosition[];
  totals: {
    positionsValueEur: number;
    totalLoadEur: number;
    totalPlEur: number;
    totalPlPct: number;
  };
};

export function PortfolioTable({ positions, totals }: Props) {
  const groups = groupByCategory(positions);
  const [editingPosition, setEditingPosition] = useState<ComputedPosition | null>(
    null,
  );

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3">ISIN / Symbol</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3 text-right">%</th>
                <th className="px-4 py-3 text-right">Price (EUR)</th>
                <th className="px-4 py-3 text-right">Shares</th>
                <th className="px-4 py-3 text-right">Load value</th>
                <th className="px-4 py-3 text-right">Value EUR</th>
                <th className="px-4 py-3 text-right">P/L %</th>
                <th className="px-4 py-3 text-right">P/L EUR</th>
                <th className="px-4 py-3 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(["equity_etf", "bond_etf", "crypto"] as const).map((cat) => {
                const items = groups[cat];
                if (!items?.length) return null;
                return (
                  <Fragment key={cat}>
                    <tr className="bg-zinc-800/40">
                      <td
                        colSpan={10}
                        className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400"
                      >
                        {CATEGORY_LABELS[cat]}
                      </td>
                    </tr>
                    {items.map((pos) => (
                      <PositionRow
                        key={pos.id}
                        position={pos}
                        onEdit={setEditingPosition}
                      />
                    ))}
                  </Fragment>
                );
              })}
              <tr className="border-t border-zinc-700 bg-zinc-800/60 font-semibold">
                <td colSpan={5} className="px-4 py-3 text-zinc-200">
                  Total (without cash)
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-200">
                  {formatEur(totals.totalLoadEur)}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-100">
                  {formatEur(totals.positionsValueEur)}
                </td>
                <td
                  className={`px-4 py-3 text-right font-mono tabular-nums ${
                    totals.totalPlPct >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {totals.totalPlPct >= 0 ? "+" : ""}
                  {formatPct(totals.totalPlPct)}
                </td>
                <td
                  className={`px-4 py-3 text-right font-mono tabular-nums ${
                    totals.totalPlEur >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {totals.totalPlEur >= 0 ? "+" : ""}
                  {formatEur(totals.totalPlEur)}
                </td>
                <td className="px-4 py-3" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {editingPosition && (
        <PositionEditModal
          position={editingPosition}
          onClose={() => setEditingPosition(null)}
        />
      )}
    </>
  );
}

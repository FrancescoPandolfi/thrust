"use client";

import { Fragment, useState } from "react";
import {
  updatePositionLoadValue,
  updatePositionShares,
} from "@/lib/actions/positions";
import type { ComputedPosition } from "@/lib/calculations";
import { CATEGORY_LABELS, groupByCategory } from "@/lib/calculations";
import { formatEur, formatNumber, formatPct, parseDecimal } from "@/lib/format";
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

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-3">ISIN</th>
              <th className="px-4 py-3">Ticker</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3 text-right">%</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Shares</th>
              <th className="px-4 py-3 text-right">Load value</th>
              <th className="px-4 py-3 text-right">Value EUR</th>
              <th className="px-4 py-3 text-right">P/L %</th>
              <th className="px-4 py-3 text-right">P/L EUR</th>
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
                    <PositionRow key={pos.id} position={pos} />
                  ))}
                </Fragment>
              );
            })}
            <tr className="border-t border-zinc-700 bg-zinc-800/60 font-semibold">
              <td colSpan={6} className="px-4 py-3 text-zinc-200">
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
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function EditableCell({
  value,
  onSave,
  format = (v: number) => formatNumber(v),
}: {
  value: number;
  onSave: (v: number) => Promise<void>;
  format?: (v: number) => string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(format(value));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onSave(parseDecimal(draft));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(format(value));
          setEditing(true);
        }}
        className="font-mono tabular-nums text-zinc-200 hover:text-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
        title="Click to edit"
      >
        {format(value)}
      </button>
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      disabled={saving}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") setEditing(false);
      }}
      className="w-24 rounded border border-zinc-600 bg-zinc-800 px-2 py-0.5 text-right font-mono tabular-nums text-zinc-100 focus:border-blue-500 focus:outline-none"
    />
  );
}

export { updatePositionShares, updatePositionLoadValue };

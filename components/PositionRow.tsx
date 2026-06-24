"use client";

import type { ComputedPosition } from "@/lib/calculations";
import { formatEur, formatNumber, formatPct } from "@/lib/format";
import {
  EditableCell,
  updatePositionLoadValue,
  updatePositionShares,
} from "./PortfolioTable";

type Props = {
  position: ComputedPosition;
};

export function PositionRow({ position }: Props) {
  const plPositive = position.plEur >= 0;

  return (
    <tr className="border-b border-zinc-800/60 even:bg-zinc-900/50 hover:bg-zinc-800/30">
      <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">
        {position.isin ?? "—"}
      </td>
      <td className="px-4 py-2.5 font-mono text-xs text-zinc-300">
        <span>{position.googleTicker}</span>
        <span className="mt-0.5 block text-[10px] text-zinc-500">
          {position.yahooSymbol}
        </span>
        {position.stale && (
          <span className="ml-1 rounded bg-amber-900/50 px-1 text-[10px] text-amber-400">
            stale
          </span>
        )}
      </td>
      <td className="px-4 py-2.5 text-zinc-200">{position.title}</td>
      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-zinc-400">
        {formatNumber(position.weightPct, 1)}%
      </td>
      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-zinc-300">
        {formatNumber(position.priceEur, 2)}
      </td>
      <td className="px-4 py-2.5 text-right">
        <EditableCell
          value={Number.parseFloat(position.shares)}
          format={(v) => formatNumber(v, 6)}
          onSave={(v) => updatePositionShares(position.id, v)}
        />
      </td>
      <td className="px-4 py-2.5 text-right">
        <EditableCell
          value={Number.parseFloat(position.loadValueEur)}
          format={(v) => formatEur(v)}
          onSave={(v) => updatePositionLoadValue(position.id, v)}
        />
      </td>
      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-zinc-100">
        {formatEur(position.valueEur)}
      </td>
      <td
        className={`px-4 py-2.5 text-right font-mono tabular-nums ${
          plPositive ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        {plPositive ? "+" : ""}
        {formatPct(position.plPct)}
      </td>
      <td
        className={`px-4 py-2.5 text-right font-mono tabular-nums ${
          plPositive ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        {plPositive ? "+" : ""}
        {formatEur(position.plEur)}
      </td>
    </tr>
  );
}

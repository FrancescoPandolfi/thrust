"use client";

import type { ComputedPosition } from "@/lib/calculations";
import { formatEur, formatNumber, formatPercentPoints, formatPct, formatUsd } from "@/lib/format";

type Props = {
  position: ComputedPosition;
  onEdit: (position: ComputedPosition) => void;
};

export function PositionRow({ position, onEdit }: Props) {
  const plPositive = position.plEur >= 0;
  const instrumentLabel = position.symbol ?? position.isin ?? "—";

  return (
    <tr className="border-b border-zinc-800/60 even:bg-zinc-900/50 hover:bg-zinc-800/20">
      <td className="px-4 py-2.5 font-mono text-xs text-zinc-300">
        <span>{instrumentLabel}</span>
        {position.micCode && (
          <span className="mt-0.5 block text-[10px] text-zinc-500">
            {position.micCode}
          </span>
        )}
        {position.stale && (
          <span className="ml-1 rounded bg-amber-900/50 px-1 text-[10px] text-amber-400">
            stale
          </span>
        )}
      </td>
      <td className="px-4 py-2.5 text-zinc-200">{position.title}</td>
      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-zinc-400">
        {formatPercentPoints(position.weightPct, 1)}
      </td>
      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-zinc-300">
        {position.priceEur > 0 && position.priceUsd > 0 ? (
          <span
            className="cursor-help border-b border-dotted border-zinc-600"
            title={formatUsd(position.priceUsd)}
          >
            {formatNumber(position.priceEur, 2)}
          </span>
        ) : (
          formatNumber(position.priceEur, 2)
        )}
      </td>
      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-zinc-200">
        {formatNumber(Number.parseFloat(position.shares), 2)}
      </td>
      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-zinc-200">
        {formatEur(Number.parseFloat(position.loadValueEur))}
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
      <td className="px-4 py-2.5 text-right">
        <button
          type="button"
          onClick={() => onEdit(position)}
          className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          Edit
        </button>
      </td>
    </tr>
  );
}

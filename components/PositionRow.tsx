"use client";

import type { ComputedPosition } from "@/lib/calculations";
import { formatEur, formatNumber, formatPercentPoints, formatPct, formatUsd, SHARES_DECIMALS } from "@/lib/format";
import { CopyValueButton } from "./CopyValueButton";
import { DeleteIconButton, EditIconButton } from "./icons/ActionButtons";

type Props = {
  position: ComputedPosition;
  onEdit: (position: ComputedPosition) => void;
  onDelete: (position: ComputedPosition) => void;
  readOnly?: boolean;
};

export function PositionRow({ position, onEdit, onDelete, readOnly = false }: Props) {
  const plPositive = position.plEur >= 0;
  const instrumentLabel = position.isin ?? position.symbol ?? "—";

  return (
    <tr className="border-b border-zinc-800/60 even:bg-zinc-900/50 hover:bg-zinc-800/20">
      <td className="px-4 py-2.5 font-mono text-xs text-zinc-300">
        <span>{instrumentLabel}</span>
        {position.isin && position.symbol && position.category !== "crypto" && (
          <span className="mt-0.5 block text-[10px] text-zinc-500">
            {position.symbol}
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
        <span className="inline-flex items-center justify-end gap-1">
          <span>{formatNumber(Number.parseFloat(position.shares), 2)}</span>
          <CopyValueButton
            value={position.shares}
            decimals={SHARES_DECIMALS}
            label="Copy shares"
          />
        </span>
      </td>
      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-zinc-200">
        <span className="inline-flex items-center justify-end gap-1">
          <span>{formatEur(Number.parseFloat(position.loadValueEur))}</span>
          <CopyValueButton
            value={position.loadValueEur}
            decimals={2}
            label="Copy load value"
          />
        </span>
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
      {!readOnly && (
        <td className="px-4 py-2.5 text-right">
          <div className="flex justify-end gap-2">
            <EditIconButton
              label={`Edit ${position.title}`}
              onClick={() => onEdit(position)}
            />
            <DeleteIconButton
              label={`Remove ${position.title}`}
              onClick={() => onDelete(position)}
            />
          </div>
        </td>
      )}
    </tr>
  );
}

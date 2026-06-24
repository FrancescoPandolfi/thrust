"use client";

import type { ComputedPosition } from "@/lib/calculations";
import { formatEur, formatPercentPoints } from "@/lib/format";

type ChartSlice = {
  name: string;
  value: number;
  pct: number;
};

type Props = {
  positions: ComputedPosition[];
  embedded?: boolean;
};

const BAR_COLORS = ["#DFFF00", "#a78bfa", "#34d399", "#fbbf24", "#fb7185"];

function buildChartData(positions: ComputedPosition[]): ChartSlice[] {
  const withValue = positions
    .filter((position) => position.valueEur > 0)
    .sort((a, b) => b.valueEur - a.valueEur);
  const total = withValue.reduce((sum, position) => sum + position.valueEur, 0);

  return withValue.map((position) => ({
    name: position.title,
    value: position.valueEur,
    pct: total > 0 ? (position.valueEur / total) * 100 : 0,
  }));
}

export function AllocationByTitleChart({ positions, embedded = false }: Props) {
  const data = buildChartData(positions);

  if (data.length === 0) {
    if (embedded) {
      return (
        <p className="py-6 text-center text-sm text-zinc-400">No data yet</p>
      );
    }

    return (
      <div className="flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          Allocation by title
        </h2>
        <p className="mt-auto py-4 text-center text-sm text-zinc-400">No data yet</p>
      </div>
    );
  }

  const list = (
    <ul
      className={`space-y-2 pr-1 text-xs ${
        embedded ? "h-full overflow-y-auto" : "mt-3 max-h-48 overflow-y-auto"
      }`}
    >
      {data.map((slice, index) => {
        const color = BAR_COLORS[index % BAR_COLORS.length];
        return (
          <li key={slice.name} title={`${slice.name} — ${formatEur(slice.value)}`}>
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="min-w-0 flex-1 truncate text-zinc-300">{slice.name}</span>
              <span className="shrink-0 font-mono tabular-nums text-zinc-400">
                {formatPercentPoints(slice.pct, 0)}
              </span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${slice.pct}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );

  if (embedded) return list;

  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        Allocation by title
      </h2>
      {list}
    </div>
  );
}

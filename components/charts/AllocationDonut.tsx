"use client";

import { formatEur, formatPercentPoints } from "@/lib/format";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type Slice = { name: string; value: number };

type Props = {
  data: Slice[];
};

const SLICE_COLORS = ["#DFFF00", "#a78bfa", "#34d399", "#fbbf24", "#fb7185"];

function AllocationTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: Slice & { pct: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-zinc-100">{item.name}</p>
      <p className="font-mono tabular-nums text-zinc-300">
        {formatEur(item.value)} ({formatPercentPoints(item.pct)})
      </p>
    </div>
  );
}

export function AllocationDonut({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-sm font-medium text-zinc-100">Allocation by category</h2>
        <p className="mt-4 text-sm text-zinc-400">No data yet</p>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const slices = data.map((item) => ({
    ...item,
    pct: total > 0 ? (item.value / total) * 100 : 0,
  }));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="text-sm font-medium text-zinc-100">Allocation by category</h2>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="mx-auto h-44 w-44 shrink-0 sm:mx-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="62%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
                stroke="rgb(9 9 11)"
                strokeWidth={2}
              >
                {slices.map((slice, index) => (
                  <Cell
                    key={slice.name}
                    fill={SLICE_COLORS[index % SLICE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<AllocationTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex flex-1 flex-wrap gap-x-6 gap-y-2 text-sm sm:flex-col">
          {slices.map((slice, index) => (
            <li key={slice.name} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: SLICE_COLORS[index % SLICE_COLORS.length],
                }}
              />
              <span className="text-zinc-300">{slice.name}</span>
              <span className="font-mono tabular-nums text-zinc-400">
                {formatPercentPoints(slice.pct)}
              </span>
              <span className="font-mono tabular-nums text-zinc-500">
                {formatEur(slice.value)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

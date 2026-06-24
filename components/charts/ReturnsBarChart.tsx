"use client";

import { formatPct } from "@/lib/format";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_AXIS,
  CHART_GRID,
  CHART_NEGATIVE,
  CHART_POSITIVE,
  chartTooltipStyle,
} from "@/components/charts/chartTheme";

type Props = {
  data:
    | { date: string; returnPct: number }[]
    | { week: string; returnPct: number }[];
  indexKey: "date" | "week";
  title: string;
};

function ReturnsTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length || label == null) return null;

  const value = payload[0].value;
  const positive = value >= 0;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm shadow-lg">
      <p className="text-zinc-400">{label}</p>
      <p
        className={`font-mono tabular-nums ${
          positive ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        {formatPct(value)}
      </p>
    </div>
  );
}

export function ReturnsBarChart({ data, indexKey, title }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          {title}
        </h2>
        <p className="mt-4 py-8 text-center text-sm text-zinc-400">
          No return history yet. Daily returns are computed after the close snapshot.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        {title}
      </h2>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey={indexKey}
              tick={{ fill: CHART_AXIS, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: CHART_AXIS, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={56}
              tickFormatter={(value: number) => formatPct(value)}
            />
            <ReferenceLine y={0} stroke={CHART_GRID} />
            <Tooltip content={<ReturnsTooltip />} {...chartTooltipStyle} />
            <Bar dataKey="returnPct" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {data.map((entry, index) => (
                <Cell
                  key={`${indexKey}-${index}`}
                  fill={entry.returnPct >= 0 ? CHART_POSITIVE : CHART_NEGATIVE}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

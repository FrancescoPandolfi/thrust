"use client";

import { formatEur, formatEurAxis } from "@/lib/format";
import type { CapitalFlowMonthRow } from "@/lib/capital-flows";
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
  chartTooltipContentStyle,
  chartTooltipCursor,
  chartTooltipWrapperStyle,
} from "@/components/charts/chartTheme";

type Props = {
  data: CapitalFlowMonthRow[];
};

function FlowsTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload: CapitalFlowMonthRow }[];
  label?: string;
}) {
  if (!active || !payload?.length || label == null) return null;

  const { inEur, outEur, netEur } = payload[0].payload;
  const positive = netEur >= 0;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm shadow-lg">
      <p className="text-zinc-400">{label}</p>
      <p className="font-mono tabular-nums text-emerald-400">
        In: +{formatEur(inEur)}
      </p>
      <p className="font-mono tabular-nums text-rose-400">
        Out: −{formatEur(outEur)}
      </p>
      <p
        className={`mt-1 border-t border-zinc-700 pt-1 font-mono tabular-nums ${
          positive ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        Net: {positive ? "+" : ""}
        {formatEur(netEur)}
      </p>
    </div>
  );
}

export function CapitalFlowsMonthlyChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          Monthly flows
        </h2>
        <p className="mt-4 py-8 text-center text-sm text-zinc-400">
          No capital flows yet. Flows are recorded when you buy or sell via the
          position editor.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        Monthly flows
      </h2>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              stroke={CHART_GRID}
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="label"
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
              tickFormatter={(value: number) => formatEurAxis(value)}
            />
            <ReferenceLine y={0} stroke={CHART_GRID} />
            <Tooltip
              content={<FlowsTooltip />}
              cursor={chartTooltipCursor}
              wrapperStyle={chartTooltipWrapperStyle}
              contentStyle={chartTooltipContentStyle}
            />
            <Bar dataKey="netEur" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {data.map((entry, index) => (
                <Cell
                  key={`month-${index}`}
                  fill={entry.netEur >= 0 ? CHART_POSITIVE : CHART_NEGATIVE}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

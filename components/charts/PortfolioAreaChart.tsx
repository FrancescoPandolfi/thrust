"use client";

import { formatEur, formatEurAxis } from "@/lib/format";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_ACCENT,
  CHART_AXIS,
  CHART_GRID,
  chartTooltipContentStyle,
  chartTooltipCursor,
  chartTooltipWrapperStyle,
} from "@/components/charts/chartTheme";

type Props = {
  data: { date: string; positionsValueEur: number }[];
  compact?: boolean;
  title?: string;
};

function PortfolioTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length || label == null) return null;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm shadow-lg">
      <p className="text-zinc-400">{label}</p>
      <p className="font-mono tabular-nums text-zinc-100">
        {formatEur(payload[0].value)}
      </p>
    </div>
  );
}

function EmptyChart({
  compact,
  title,
}: {
  compact: boolean;
  title: string;
}) {
  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-900 ${
        compact ? "flex h-full flex-col p-4" : "p-4"
      }`}
    >
      <h2
        className={
          compact
            ? "text-xs font-medium uppercase tracking-wide text-zinc-400"
            : "text-sm font-medium text-zinc-100"
        }
      >
        {title}
      </h2>
      <p
        className={`text-sm text-zinc-400 ${
          compact ? "mt-auto py-6 text-center" : "mt-4 py-8 text-center"
        }`}
      >
        No portfolio history yet. Snapshots are captured daily at midnight (Europe/Rome).
      </p>
    </div>
  );
}

export function PortfolioAreaChart({
  data,
  compact = false,
  title = "Positions value over time",
}: Props) {
  if (data.length === 0) {
    return <EmptyChart compact={compact} title={title} />;
  }

  const chartHeight = compact ? "min-h-[10rem] h-40" : "h-72";
  const yAxisWidth = compact ? 72 : 88;
  const tickFormatter = compact ? formatEurAxis : formatEur;

  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-900 ${
        compact ? "flex h-full min-h-[250px] flex-col p-4" : "p-4"
      }`}
    >
      <h2
        className={
          compact
            ? "text-xs font-medium uppercase tracking-wide text-zinc-400"
            : "text-sm font-medium text-zinc-100"
        }
      >
        {title}
      </h2>
      <div
        className={`${compact ? "mt-3 min-h-0 flex-1 overflow-visible" : "mt-4"} ${chartHeight}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
          >
            <defs>
              <linearGradient id="portfolioValueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_ACCENT} stopOpacity={0.35} />
                <stop offset="95%" stopColor={CHART_ACCENT} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: CHART_AXIS, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: CHART_AXIS, fontSize: compact ? 10 : 11 }}
              axisLine={false}
              tickLine={false}
              width={yAxisWidth}
              tickFormatter={tickFormatter}
            />
            <Tooltip
              content={<PortfolioTooltip />}
              cursor={chartTooltipCursor}
              wrapperStyle={chartTooltipWrapperStyle}
              contentStyle={chartTooltipContentStyle}
            />
            <Area
              type="monotone"
              dataKey="positionsValueEur"
              stroke={CHART_ACCENT}
              strokeWidth={2}
              fill="url(#portfolioValueFill)"
              dot={{ r: data.length === 1 ? 4 : 2, fill: CHART_ACCENT, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: CHART_ACCENT, stroke: "rgb(9 9 11)", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

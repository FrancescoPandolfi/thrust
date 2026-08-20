"use client";

import { useMemo, useState } from "react";
import { formatEur, formatEurAxis, formatPct } from "@/lib/format";
import type { PriceHistoryPoint } from "@/lib/price-history";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
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
  data: PriceHistoryPoint[];
  loadValueEur: number;
  title?: string;
};

type YScaleMode = "full" | "fit" | "zoom";

const Y_SCALE_MODES = [
  { id: "full" as const, label: "Full", title: "Axis from zero" },
  { id: "fit" as const, label: "Auto", title: "Fit data range" },
  { id: "zoom" as const, label: "Zoom", title: "Tight zoom on variations" },
] as const;

function paddedValueDomain(values: number[], paddingRatio: number): [number, number] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  if (span === 0) {
    const cushion = Math.max(Math.abs(min) * 0.02, 50);
    return [min - cushion, max + cushion];
  }

  const cushion = span * paddingRatio;
  return [min - cushion, max + cushion];
}

function valueDomain(values: number[], mode: YScaleMode): [number, number] {
  const max = Math.max(...values);
  const span = Math.max(...values) - Math.min(...values);
  const topCushion = Math.max(span * 0.05, max * 0.02, 50);

  switch (mode) {
    case "full":
      return [0, max + topCushion];
    case "fit":
      return paddedValueDomain(values, 0.1);
    case "zoom":
      return paddedValueDomain(values, 0.02);
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

function ValueTooltip({
  active,
  payload,
  label,
  loadValueEur,
}: {
  active?: boolean;
  payload?: { value: number; payload: PriceHistoryPoint }[];
  label?: string;
  loadValueEur: number;
}) {
  if (!active || !payload?.length || label == null) return null;

  const point = payload[0].payload;
  const plEur = point.valueEur - loadValueEur;
  const plPct = loadValueEur > 0 ? point.valueEur / loadValueEur - 1 : 0;
  const plPositive = plEur >= 0;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm shadow-lg">
      <p className="text-zinc-400">{label}</p>
      <p className="font-mono tabular-nums text-zinc-100">
        {formatEur(point.valueEur)}
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        Price {formatEur(point.priceEur)}
      </p>
      <p
        className={`mt-1 font-mono text-xs tabular-nums ${
          plPositive ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        {plPositive ? "+" : ""}
        {formatEur(plEur)} ({plPositive ? "+" : ""}
        {formatPct(plPct)})
      </p>
    </div>
  );
}

function ScaleToggle({
  value,
  onChange,
}: {
  value: YScaleMode;
  onChange: (mode: YScaleMode) => void;
}) {
  return (
    <div className="flex shrink-0 gap-0.5 rounded-md border border-zinc-800 bg-zinc-950 p-1">
      {Y_SCALE_MODES.map((mode) => (
        <button
          key={mode.id}
          type="button"
          title={mode.title}
          aria-pressed={value === mode.id}
          onClick={() => onChange(mode.id)}
          className={`cursor-pointer rounded px-2 py-0.5 text-xs font-medium transition-colors ${
            value === mode.id
              ? "bg-zinc-800 text-accent"
              : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}

export function InstrumentValueChart({
  data,
  loadValueEur,
  title = "Your position value",
}: Props) {
  const [scaleMode, setScaleMode] = useState<YScaleMode>("fit");

  const chartData = useMemo(
    () =>
      data.map((point) => ({
        ...point,
        positionsValueEur: point.valueEur,
      })),
    [data],
  );

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-sm font-medium text-zinc-100">{title}</h2>
        <p className="mt-4 py-8 text-center text-sm text-zinc-400">
          No price history available for this instrument yet.
        </p>
      </div>
    );
  }

  const values = chartData.map((point) => point.positionsValueEur);
  const yDomain = valueDomain([...values, loadValueEur], scaleMode);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-medium text-zinc-100">{title}</h2>
        <ScaleToggle value={scaleMode} onChange={setScaleMode} />
      </div>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
          >
            <defs>
              <linearGradient id="instrumentValueFill" x1="0" y1="0" x2="0" y2="1">
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
              domain={yDomain}
              tick={{ fill: CHART_AXIS, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={88}
              tickFormatter={formatEurAxis}
            />
            <Tooltip
              content={<ValueTooltip loadValueEur={loadValueEur} />}
              cursor={chartTooltipCursor}
              wrapperStyle={chartTooltipWrapperStyle}
              contentStyle={chartTooltipContentStyle}
            />
            {loadValueEur > 0 && (
              <ReferenceLine
                y={loadValueEur}
                stroke="rgb(161 161 170)"
                strokeDasharray="4 4"
                label={{
                  value: "Cost basis",
                  position: "insideTopRight",
                  fill: "rgb(161 161 170)",
                  fontSize: 11,
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="positionsValueEur"
              stroke={CHART_ACCENT}
              strokeWidth={2}
              fill="url(#instrumentValueFill)"
              dot={{
                r: chartData.length === 1 ? 4 : 2,
                fill: CHART_ACCENT,
                strokeWidth: 0,
              }}
              activeDot={{
                r: 5,
                fill: CHART_ACCENT,
                stroke: "rgb(9 9 11)",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

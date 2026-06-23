"use client";

import { Card, Flex, Metric, Text } from "@tremor/react";
import { formatEur, formatPct } from "@/lib/format";

type Props = {
  totalValueEur: number;
  totalPlEur: number;
  totalPlPct: number;
  cashValueEur: number;
};

export function PortfolioMetrics({
  totalValueEur,
  totalPlEur,
  totalPlPct,
  cashValueEur,
}: Props) {
  const plColor = totalPlEur >= 0 ? "text-emerald-400" : "text-rose-400";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <Text>Total portfolio</Text>
        <Metric className="font-mono tabular-nums">
          {formatEur(totalValueEur)}
        </Metric>
      </Card>
      <Card>
        <Text>Total P/L</Text>
        <Metric className={`font-mono tabular-nums ${plColor}`}>
          {totalPlEur >= 0 ? "+" : ""}
          {formatEur(totalPlEur)}
        </Metric>
      </Card>
      <Card>
        <Text>Total P/L %</Text>
        <Metric className={`font-mono tabular-nums ${plColor}`}>
          {totalPlPct >= 0 ? "+" : ""}
          {formatPct(totalPlPct)}
        </Metric>
      </Card>
      <Card>
        <Text>Cash</Text>
        <Metric className="font-mono tabular-nums">
          {formatEur(cashValueEur)}
        </Metric>
      </Card>
    </div>
  );
}

"use client";

import { BadgeDelta, Card, Flex, Metric, Text } from "@tremor/react";
import { formatDate, formatEur, formatPct } from "@/lib/format";

type Props = {
  date: string;
  startValueEur: number | null;
  endValueEur: number | null;
  returnEur: number | null;
  returnPct: number | null;
  inProgress: boolean;
};

export function ReturnsSummary({
  date,
  startValueEur,
  endValueEur,
  returnEur,
  returnPct,
  inProgress,
}: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <Text>Date</Text>
        <Metric className="font-mono text-xl">{formatDate(date)}</Metric>
        {inProgress && (
          <Text className="mt-1 text-amber-400">Day in progress</Text>
        )}
      </Card>
      <Card>
        <Text>Start value (open)</Text>
        <Metric className="font-mono tabular-nums">
          {startValueEur != null ? formatEur(startValueEur) : "—"}
        </Metric>
      </Card>
      <Card>
        <Text>{inProgress ? "Current value" : "End value (close)"}</Text>
        <Metric className="font-mono tabular-nums">
          {endValueEur != null ? formatEur(endValueEur) : "—"}
        </Metric>
      </Card>
      <Card>
        <Flex justifyContent="between" alignItems="start">
          <div>
            <Text>Today&apos;s return</Text>
            <Metric
              className={`font-mono tabular-nums ${
                (returnEur ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {returnEur != null
                ? `${returnEur >= 0 ? "+" : ""}${formatEur(returnEur)}`
                : "—"}
            </Metric>
          </div>
          {returnPct != null && (
            <BadgeDelta
              deltaType={returnPct >= 0 ? "increase" : "decrease"}
              isIncreasePositive
            >
              {formatPct(returnPct)}
            </BadgeDelta>
          )}
        </Flex>
      </Card>
    </div>
  );
}

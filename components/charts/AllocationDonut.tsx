"use client";

import { Card, DonutChart, Title } from "@tremor/react";
import { CATEGORY_LABELS } from "@/lib/calculations";

type Props = {
  data: { name: string; value: number }[];
};

export function AllocationDonut({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <Title>Allocation</Title>
        <p className="mt-4 text-sm text-zinc-400">No data yet</p>
      </Card>
    );
  }

  return (
    <Card>
      <Title>Allocation by category</Title>
      <DonutChart
        className="mt-4 h-64"
        data={data}
        category="value"
        index="name"
        colors={["blue", "violet", "emerald", "amber", "rose"]}
        valueFormatter={(v) =>
          new Intl.NumberFormat("en-EU", {
            style: "currency",
            currency: "EUR",
          }).format(v)
        }
      />
    </Card>
  );
}

export function buildCategoryAllocation(
  groups: Record<string, { valueEur: number }[]>,
): { name: string; value: number }[] {
  return (["equity_etf", "bond_etf", "crypto"] as const)
    .map((cat) => ({
      name: CATEGORY_LABELS[cat] ?? cat,
      value: (groups[cat] ?? []).reduce((s, p) => s + p.valueEur, 0),
    }))
    .filter((d) => d.value > 0);
}

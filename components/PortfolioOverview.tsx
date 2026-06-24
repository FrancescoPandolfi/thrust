"use client";

import { AllocationPanel } from "@/components/charts/AllocationPanel";
import { PortfolioMetrics } from "@/components/charts/PortfolioMetrics";
import type { ComputedPosition } from "@/lib/calculations";

type AllocationSlice = { name: string; value: number };

type Props = {
  totalValueEur: number;
  totalPlEur: number;
  totalPlPct: number;
  todayReturnEur: number | null;
  todayReturnPct: number | null;
  allocation: AllocationSlice[];
  positions: ComputedPosition[];
};

export function PortfolioOverview({
  totalValueEur,
  totalPlEur,
  totalPlPct,
  todayReturnEur,
  todayReturnPct,
  allocation,
  positions,
}: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] xl:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <PortfolioMetrics
        totalValueEur={totalValueEur}
        totalPlEur={totalPlEur}
        totalPlPct={totalPlPct}
        includeTodayReturn
        todayReturnEur={todayReturnEur}
        todayReturnPct={todayReturnPct}
      />
      <AllocationPanel allocation={allocation} positions={positions} />
    </div>
  );
}

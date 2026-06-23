import { AppShell } from "@/components/AppShell";
import {
  AllocationDonut,
} from "@/components/charts/AllocationDonut";
import { PortfolioMetrics } from "@/components/charts/PortfolioMetrics";
import { PortfolioTable } from "@/components/PortfolioTable";
import { RefreshPricesButton } from "@/components/RefreshPricesButton";
import { loadPortfolioData } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { positions, totals, allocation } = await loadPortfolioData();

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-zinc-100">Portfolio</h1>
          <RefreshPricesButton />
        </div>

        <PortfolioMetrics
          totalValueEur={totals.totalValueEur}
          totalPlEur={totals.totalPlEur}
          totalPlPct={totals.totalPlPct}
          cashValueEur={totals.cashValueEur}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PortfolioTable positions={positions} totals={totals} />
          </div>
          <AllocationDonut data={allocation} />
        </div>
      </div>
    </AppShell>
  );
}

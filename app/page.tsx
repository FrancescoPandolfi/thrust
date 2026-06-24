import { AppShell } from "@/components/AppShell";
import { PortfolioOverview } from "@/components/PortfolioOverview";
import { PortfolioTable } from "@/components/PortfolioTable";
import { RefreshPricesButton } from "@/components/RefreshPricesButton";
import { loadPortfolioData } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { positions, totals, allocation } = await loadPortfolioData();
  const needsRefresh = positions.some(
    (position) => position.stale || position.price <= 0,
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-zinc-100">Portfolio</h1>

        {needsRefresh && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Prices are missing or outdated. Click <strong>Refresh prices</strong>{" "}
            once — if the data provider rate-limits you, wait a few minutes and try again.
          </div>
        )}

        <PortfolioOverview
          totalValueEur={totals.positionsValueEur}
          totalPlEur={totals.totalPlEur}
          totalPlPct={totals.totalPlPct}
          totalLoadEur={totals.totalLoadEur}
          allocation={allocation}
          positions={positions}
        />

        <PortfolioTable positions={positions} totals={totals} />
      </div>
      <RefreshPricesButton />
    </AppShell>
  );
}

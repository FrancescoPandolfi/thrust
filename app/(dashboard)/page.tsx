import { PortfolioOverview } from "@/components/PortfolioOverview";
import { PortfolioTable } from "@/components/PortfolioTable";
import { RefreshPricesButton } from "@/components/RefreshPricesButton";
import { getPortfolioContext } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { loadPortfolioData } from "@/lib/portfolio";
import { getLastQuoteRefreshAt } from "@/lib/refresh-quotes";
import { getTodaySummary } from "@/lib/returns";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [context, { positions, totals, allocation }, today, lastPriceUpdate] =
    await Promise.all([
      getPortfolioContext(),
      loadPortfolioData(),
      getTodaySummary(),
      getLastQuoteRefreshAt(),
    ]);
  const readOnly = context?.readOnly ?? true;
  const canRefreshPrices = context?.canRefreshPrices ?? false;
  const isAggregate = context?.viewMode === "aggregate";
  const needsRefresh = positions.some(
    (position) => position.stale || position.price <= 0,
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">
              {isAggregate ? "Combined portfolio" : (context?.name ?? "Portfolio")}
            </h1>
            {isAggregate && (
              <p className="mt-1 text-sm text-zinc-400">
                Aggregated view — duplicate holdings are merged.
              </p>
            )}
          </div>
          {lastPriceUpdate && (
            <p className="text-sm text-zinc-500">
              Last price update:{" "}
              <time dateTime={lastPriceUpdate.toISOString()}>
                {formatDateTime(lastPriceUpdate)}
              </time>
            </p>
          )}
        </div>

        {needsRefresh && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {canRefreshPrices ? (
              <>
                Prices are missing or outdated. Click <strong>Refresh prices</strong>{" "}
                once — if the data provider rate-limits you, wait a few minutes and try again.
              </>
            ) : (
              <>Prices are missing or outdated. Contact a portfolio admin to refresh market data.</>
            )}
          </div>
        )}

        <PortfolioOverview
          totalValueEur={totals.positionsValueEur}
          totalPlEur={totals.totalPlEur}
          totalPlPct={totals.totalPlPct}
          todayReturnEur={today.returnEur}
          todayReturnPct={today.returnPct}
          allocation={allocation}
          positions={positions}
        />

        <PortfolioTable positions={positions} totals={totals} readOnly={readOnly} />
      </div>
      {canRefreshPrices && <RefreshPricesButton />}
    </>
  );
}

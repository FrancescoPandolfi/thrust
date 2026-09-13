import { CashSection } from "@/components/CashSection";
import { NetWorthOverview } from "@/components/NetWorthOverview";
import { RealEstateSection } from "@/components/RealEstateSection";
import { getCurrentUserRole } from "@/lib/auth";
import { loadPortfolioData } from "@/lib/portfolio";
import { loadCurrentUserAssets } from "@/lib/user-assets";

export const dynamic = "force-dynamic";

export default async function NetWorthPage() {
  const [role, { cash, realEstate }, { totals }] = await Promise.all([
    getCurrentUserRole(),
    loadCurrentUserAssets(),
    loadPortfolioData(),
  ]);
  const readOnly = role === "viewer";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Net Worth</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Cash and real estate are personal — they stay the same when you switch
          portfolios.
        </p>
      </div>
      <NetWorthOverview
        positionsValueEur={totals.positionsValueEur}
        cashValueEur={totals.cashValueEur}
        realEstateValueEur={totals.realEstateValueEur}
        totalValueEur={totals.totalValueEur}
        totalPlEur={totals.totalPlEur}
        totalPlPct={totals.totalPlPctWithCash}
      />
      <CashSection
        balances={cash}
        cashValueEur={totals.cashValueEur}
        readOnly={readOnly}
      />
      <RealEstateSection
        assets={realEstate}
        realEstateValueEur={totals.realEstateValueEur}
        readOnly={readOnly}
      />
    </div>
  );
}

import { PortfolioMetrics } from "@/components/charts/PortfolioMetrics";
import { CashSection } from "@/components/CashSection";
import { getCurrentUserRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { loadPortfolioData } from "@/lib/portfolio";
import { cashBalances } from "@/lib/schema";

export const dynamic = "force-dynamic";

export default async function CashPage() {
  const db = getDb();
  const [balances, { totals }, role] = await Promise.all([
    db.select().from(cashBalances),
    loadPortfolioData(),
    getCurrentUserRole(),
  ]);
  const readOnly = role === "viewer";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-100">Cash</h1>
      <PortfolioMetrics
        totalValueEur={totals.totalValueEur}
        totalPlEur={totals.totalPlEur}
        totalPlPct={totals.totalPlPctWithCash}
        includeCashMetric={false}
      />
      <CashSection balances={balances} cashValueEur={totals.cashValueEur} readOnly={readOnly} />
    </div>
  );
}

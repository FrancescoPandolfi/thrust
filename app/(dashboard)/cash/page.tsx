import { PortfolioMetrics } from "@/components/charts/PortfolioMetrics";
import { CashSection } from "@/components/CashSection";
import { getPortfolioContext } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { loadPortfolioData } from "@/lib/portfolio";
import { cashBalances } from "@/lib/schema";
import { inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function CashPage() {
  const context = await getPortfolioContext();
  const portfolioIds =
    context?.viewMode === "aggregate"
      ? context.aggregatePortfolioIds
      : context
        ? [context.id]
        : [];

  const db = getDb();
  const [balances, { totals }] = await Promise.all([
    portfolioIds.length > 0
      ? db
          .select()
          .from(cashBalances)
          .where(inArray(cashBalances.portfolioId, portfolioIds))
      : Promise.resolve([]),
    loadPortfolioData(),
  ]);
  const readOnly = context?.readOnly ?? true;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-100">
        {context?.viewMode === "aggregate" ? "Combined cash" : "Cash"}
      </h1>
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

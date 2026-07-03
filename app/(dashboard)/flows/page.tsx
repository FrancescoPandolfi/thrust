import { CapitalFlowsMonthlyChart } from "@/components/charts/CapitalFlowsMonthlyChart";
import { CapitalFlowsTable } from "@/components/CapitalFlowsTable";
import { getCapitalFlows, getCapitalFlowsByMonth } from "@/lib/capital-flows";
import { formatEur } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function FlowsPage() {
  const [flows, monthlyFlows] = await Promise.all([
    getCapitalFlows(),
    getCapitalFlowsByMonth(),
  ]);
  const totalIn = flows
    .filter((row) => row.amountEur > 0)
    .reduce((sum, row) => sum + row.amountEur, 0);
  const totalOut = flows
    .filter((row) => row.amountEur < 0)
    .reduce((sum, row) => sum + Math.abs(row.amountEur), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Capital flows</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Buys and sells recorded when you update positions. Used to keep daily
          returns free of new capital.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Total in
          </p>
          <p className="mt-1 font-mono text-lg tabular-nums text-emerald-400">
            {formatEur(totalIn)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Total out
          </p>
          <p className="mt-1 font-mono text-lg tabular-nums text-rose-400">
            {formatEur(totalOut)}
          </p>
        </div>
        <div className="col-span-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 sm:col-span-1">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Operations
          </p>
          <p className="mt-1 font-mono text-lg tabular-nums text-zinc-100">
            {flows.length}
          </p>
        </div>
      </div>

      <CapitalFlowsMonthlyChart data={monthlyFlows} />

      <CapitalFlowsTable rows={flows} />
    </div>
  );
}

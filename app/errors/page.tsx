import { AppShell } from "@/components/AppShell";
import { ErrorDashboard } from "@/components/ErrorDashboard";
import { getProductionErrors, getProductionErrorStats } from "@/lib/errors";

export const dynamic = "force-dynamic";

export default async function ErrorsPage() {
  const [errors, stats] = await Promise.all([
    getProductionErrors(),
    getProductionErrorStats(),
  ]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Errors</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Production error log for cron jobs, market data providers, and server failures.
          </p>
        </div>
        <ErrorDashboard
          errors={errors.map((row) => ({
            id: row.id,
            source: row.source,
            message: row.message,
            stack: row.stack,
            context: row.context,
            createdAt: row.createdAt.toISOString(),
          }))}
          stats={{
            total: stats.total,
            last24h: stats.last24h,
            last7d: stats.last7d,
            latestAt: stats.latestAt?.toISOString() ?? null,
          }}
        />
      </div>
    </AppShell>
  );
}

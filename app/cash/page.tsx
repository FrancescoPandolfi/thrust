import { AppShell } from "@/components/AppShell";
import { CashSection } from "@/components/CashSection";
import { getDb } from "@/lib/db";
import { cashBalances } from "@/lib/schema";

export const dynamic = "force-dynamic";

export default async function CashPage() {
  const db = getDb();
  const balances = await db.select().from(cashBalances);

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-zinc-100">Cash</h1>
        <CashSection balances={balances} />
      </div>
    </AppShell>
  );
}

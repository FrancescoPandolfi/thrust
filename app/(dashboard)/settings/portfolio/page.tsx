import { PortfolioMemberManagement } from "@/components/PortfolioMemberManagement";
import { PortfolioRenameForm } from "@/components/PortfolioRenameForm";
import {
  getPortfolioContext,
  listAccessiblePortfolios,
} from "@/lib/auth";
import { listPortfolioMembers } from "@/lib/portfolios";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PortfolioSettingsPage() {
  const context = await getPortfolioContext();
  if (!context) {
    redirect("/login");
  }

  if (context.viewMode === "aggregate") {
    const portfolios = await listAccessiblePortfolios();
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-100">Portfolio settings</h1>
        <p className="text-sm text-zinc-400">
          Switch to a single portfolio to rename it or manage members. Combined view is read-only.
        </p>
        <ul className="list-inside list-disc text-sm text-zinc-300">
          {portfolios.map((p) => (
            <li key={p.id}>{p.name}</li>
          ))}
        </ul>
      </div>
    );
  }

  const members = await listPortfolioMembers(context.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Portfolio settings</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Rename this portfolio and control who can access it.
        </p>
      </div>
      <PortfolioRenameForm
        initialName={context.name}
        portfolioRole={context.role}
      />
      <PortfolioMemberManagement
        portfolioName={context.name}
        portfolioRole={context.role}
        members={members}
      />
    </div>
  );
}

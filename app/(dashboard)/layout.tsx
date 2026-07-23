import { AppShell } from "@/components/AppShell";
import {
  getCurrentUserRole,
  getPortfolioContext,
  listAccessiblePortfolios,
} from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [role, portfolioContext, portfolios] = await Promise.all([
    getCurrentUserRole(),
    getPortfolioContext(),
    listAccessiblePortfolios(),
  ]);
  if (!role) {
    redirect("/login");
  }

  const readOnly = portfolioContext?.readOnly ?? true;

  return (
    <AppShell
      role={role}
      readOnly={readOnly}
      portfolios={portfolios}
      portfolioContext={portfolioContext}
    >
      {children}
    </AppShell>
  );
}

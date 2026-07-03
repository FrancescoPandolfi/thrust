import { AppShell } from "@/components/AppShell";
import { getCurrentUserRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getCurrentUserRole();
  if (!role) {
    redirect("/login");
  }

  return <AppShell role={role}>{children}</AppShell>;
}

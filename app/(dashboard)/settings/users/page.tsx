import { UserManagement } from "@/components/UserManagement";
import { listUsersAction } from "@/lib/actions/users";
import { getCurrentUserRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function UsersSettingsPage() {
  const role = await getCurrentUserRole();
  if (role !== "admin") {
    redirect("/");
  }

  const users = await listUsersAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Users</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage access for analysts and other collaborators. Viewer accounts
          can browse the portfolio but cannot edit data.
        </p>
      </div>
      <UserManagement initialUsers={users} />
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  addPortfolioMemberAction,
  removePortfolioMemberAction,
  updatePortfolioMemberRoleAction,
  type PortfolioMemberListItem,
} from "@/lib/actions/portfolios";
import { portfolioRoleLabel } from "@/lib/portfolios";
import type { PortfolioRole } from "@/lib/schema";

type Props = {
  portfolioName: string;
  portfolioRole: PortfolioRole;
  members: PortfolioMemberListItem[];
};

function canManageMembers(role: PortfolioRole): boolean {
  return role === "owner" || role === "admin";
}

export function PortfolioMemberManagement({
  portfolioName,
  portfolioRole,
  members,
}: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(members);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canManage = canManageMembers(portfolioRole);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const formData = new FormData(event.currentTarget);
    const result = await addPortfolioMemberAction(formData);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRows((prev) => [...prev, result.member]);
    setSuccess(`${result.member.email} added.`);
    event.currentTarget.reset();
    refresh();
  }

  async function handleRoleChange(userId: string, role: PortfolioRole) {
    setError(null);
    const result = await updatePortfolioMemberRoleAction(userId, role);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRows((prev) =>
      prev.map((row) => (row.userId === userId ? { ...row, role } : row)),
    );
    refresh();
  }

  async function handleRemove(userId: string) {
    setError(null);
    const result = await removePortfolioMemberAction(userId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRows((prev) => prev.filter((row) => row.userId !== userId));
    refresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">
          Share &ldquo;{portfolioName}&rdquo;
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Invite existing users by email. They must already have an account.
        </p>

        {canManage ? (
          <form onSubmit={handleAdd} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Email
                </span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="off"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-accent focus:outline-none"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Role
                </span>
                <select
                  name="role"
                  defaultValue="viewer"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-accent focus:outline-none"
                >
                  <option value="viewer">Viewer (read-only)</option>
                  <option value="admin">Admin (can edit)</option>
                </select>
              </label>
            </div>
            <button
              type="submit"
              disabled={pending}
              className="btn-primary rounded-lg px-4 py-2 text-sm disabled:opacity-60"
            >
              Add member
            </button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">
            You have read-only access to this portfolio.
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {success}
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-200">Members</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                {canManage && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((member) => (
                <tr
                  key={member.userId}
                  className="border-b border-zinc-800/60 even:bg-zinc-900/50"
                >
                  <td className="px-4 py-2.5 text-zinc-200">{member.email}</td>
                  <td className="px-4 py-2.5 text-zinc-400">
                    {member.name ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {canManage && member.role !== "owner" ? (
                      <select
                        value={member.role}
                        onChange={(e) =>
                          handleRoleChange(
                            member.userId,
                            e.target.value as PortfolioRole,
                          )
                        }
                        disabled={pending}
                        className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                        {portfolioRoleLabel(member.role)}
                      </span>
                    )}
                  </td>
                  {canManage && (
                    <td className="px-4 py-2.5">
                      {member.role !== "owner" && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => handleRemove(member.userId)}
                          className="text-xs text-rose-300 hover:text-rose-200 disabled:opacity-60"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

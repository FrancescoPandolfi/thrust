"use server";

import { revalidatePath } from "next/cache";
import {
  getCurrentUserId,
  getPortfolioContext,
  requirePortfolioContext,
  requirePortfolioWriteAccess,
  setActivePortfolio,
  setAggregateView,
} from "@/lib/auth";
import {
  addPortfolioMember,
  createPortfolio,
  listPortfolioMembers,
  listUserPortfolios,
  removePortfolioMember,
  renamePortfolio,
  updatePortfolioMemberRole,
  type PortfolioMemberRow,
  type PortfolioSummary,
} from "@/lib/portfolios";
import type { PortfolioRole } from "@/lib/schema";

const REVALIDATE_PATHS = [
  "/",
  "/cash",
  "/returns",
  "/flows",
  "/settings",
  "/settings/portfolio",
] as const;

function revalidatePortfolioPaths() {
  for (const path of REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

function isPortfolioRole(value: string): value is PortfolioRole {
  return value === "owner" || value === "admin" || value === "viewer";
}

export type PortfolioMemberListItem = PortfolioMemberRow;

export async function listMyPortfoliosAction(): Promise<PortfolioSummary[]> {
  await requirePortfolioContext();
  const userId = await getCurrentUserId();
  if (!userId) return [];
  return listUserPortfolios(userId);
}

export async function switchPortfolioAction(
  portfolioId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await setActivePortfolio(portfolioId);
    revalidatePortfolioPaths();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to switch portfolio",
    };
  }
}

export async function setAggregateViewAction(
  portfolioIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await setAggregateView(portfolioIds);
    revalidatePortfolioPaths();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to set aggregate view",
    };
  }
}

export async function createPortfolioAction(
  formData: FormData,
): Promise<{ ok: true; portfolio: PortfolioSummary } | { ok: false; error: string }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { ok: false, error: "Unauthorized" };
    }

    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      return { ok: false, error: "Name is required" };
    }

    const portfolio = await createPortfolio(userId, name);
    await setActivePortfolio(portfolio.id);
    revalidatePortfolioPaths();
    return { ok: true, portfolio };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create portfolio",
    };
  }
}

export async function renamePortfolioAction(
  formData: FormData,
): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  try {
    const context = await requirePortfolioWriteAccess();
    if (context.role === "viewer") {
      return { ok: false, error: "Forbidden" };
    }

    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      return { ok: false, error: "Name is required" };
    }

    const updated = await renamePortfolio(context.id, name);
    revalidatePortfolioPaths();
    return { ok: true, name: updated.name };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to rename portfolio",
    };
  }
}

export async function listPortfolioMembersAction(): Promise<
  PortfolioMemberListItem[]
> {
  const context = await requirePortfolioContext();
  if (context.viewMode === "aggregate") {
    return [];
  }
  return listPortfolioMembers(context.id);
}

export async function addPortfolioMemberAction(
  formData: FormData,
): Promise<{ ok: true; member: PortfolioMemberListItem } | { ok: false; error: string }> {
  try {
    const context = await requirePortfolioWriteAccess();
    if (context.role === "viewer") {
      return { ok: false, error: "Forbidden" };
    }

    const email = String(formData.get("email") ?? "").trim();
    const roleRaw = String(formData.get("role") ?? "viewer");
    if (!email) {
      return { ok: false, error: "Email is required" };
    }
    if (!isPortfolioRole(roleRaw) || roleRaw === "owner") {
      return { ok: false, error: "Invalid role" };
    }

    const member = await addPortfolioMember(context.id, email, roleRaw);
    revalidatePath("/settings/portfolio");
    return { ok: true, member };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to add member",
    };
  }
}

export async function updatePortfolioMemberRoleAction(
  memberUserId: string,
  role: PortfolioRole,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const context = await requirePortfolioWriteAccess();
    if (context.role === "viewer") {
      return { ok: false, error: "Forbidden" };
    }
    if (role === "owner") {
      return { ok: false, error: "Invalid role" };
    }

    await updatePortfolioMemberRole(context.id, memberUserId, role);
    revalidatePath("/settings/portfolio");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to update member",
    };
  }
}

export async function removePortfolioMemberAction(
  memberUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const context = await requirePortfolioWriteAccess();
    if (context.role !== "owner" && context.role !== "admin") {
      return { ok: false, error: "Forbidden" };
    }

    await removePortfolioMember(context.id, memberUserId);
    revalidatePath("/settings/portfolio");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to remove member",
    };
  }
}

export async function getPortfolioShellDataAction(): Promise<{
  portfolios: PortfolioSummary[];
  context: Awaited<ReturnType<typeof getPortfolioContext>>;
}> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { portfolios: [], context: null };
  }
  const [portfolios, context] = await Promise.all([
    listUserPortfolios(userId),
    getPortfolioContext(),
  ]);
  return { portfolios, context };
}

import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getSessionOptions, type SessionData } from "@/lib/session-config";
import type { PortfolioRole, UserRole } from "@/lib/schema";
import {
  canWritePortfolio,
  createPortfolio,
  getPortfolioMembership,
  listUserPortfolios,
  type PortfolioSummary,
  type PortfolioViewContext,
} from "@/lib/portfolios";
import { authenticateUser, findUserById } from "@/lib/users";

export type { SessionData } from "@/lib/session-config";
export { getSessionOptions } from "@/lib/session-config";

export type PortfolioContext = PortfolioViewContext;

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), getSessionOptions());
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session.isLoggedIn === true && typeof session.userId === "string";
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  if (!session.isLoggedIn || typeof session.userId !== "string") {
    return null;
  }
  return session.userId;
}

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const session = await getSession();
  if (!session.isLoggedIn || typeof session.userId !== "string") {
    return null;
  }
  if (session.role) {
    return session.role;
  }

  const user = await findUserById(session.userId);
  if (!user) {
    return null;
  }

  // Role is stored on login; avoid session.save() in Server Components.
  return user.role;
}

export async function requireAuth(): Promise<void> {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized");
  }
}

/** Global app admin — user management only. */
export async function requireAdmin(): Promise<void> {
  await requireAuth();
  const role = await getCurrentUserRole();
  if (role !== "admin") {
    throw new Error("Forbidden");
  }
}

/** @deprecated Use requirePortfolioWriteAccess for portfolio edits. */
export async function requireWriteAccess(): Promise<void> {
  await requirePortfolioWriteAccess();
}

export async function listAccessiblePortfolios(): Promise<PortfolioSummary[]> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return [];
  }
  return listUserPortfolios(userId);
}

function resolveActivePortfolioId(
  session: Awaited<ReturnType<typeof getSession>>,
  memberships: PortfolioSummary[],
): string | null {
  if (memberships.length === 0) {
    return null;
  }

  if (session.activePortfolioId) {
    const active = memberships.find((p) => p.id === session.activePortfolioId);
    if (active) {
      return active.id;
    }
  }

  // Fallback for legacy sessions; do not session.save() from Server Components.
  return memberships[0].id;
}

export async function getPortfolioContext(): Promise<PortfolioViewContext | null> {
  const session = await getSession();
  if (!session.isLoggedIn || typeof session.userId !== "string") {
    return null;
  }

  const memberships = await listUserPortfolios(session.userId);
  const portfolioId = resolveActivePortfolioId(session, memberships);
  if (!portfolioId) {
    return null;
  }

  const membership = await getPortfolioMembership(portfolioId, session.userId);
  if (!membership) {
    return null;
  }

  const viewMode = session.portfolioViewMode ?? "single";
  const validAggregateIds =
    viewMode === "aggregate" && session.aggregatePortfolioIds?.length
      ? session.aggregatePortfolioIds.filter((id) =>
          memberships.some((p) => p.id === id),
        )
      : [];

  if (viewMode === "aggregate" && validAggregateIds.length >= 2) {
    return {
      ...membership,
      readOnly: true,
      viewMode: "aggregate",
      aggregatePortfolioIds: validAggregateIds,
    };
  }

  return {
    ...membership,
    readOnly: !canWritePortfolio(membership.role),
    viewMode: "single",
    aggregatePortfolioIds: [],
  };
}

export async function requirePortfolioContext(): Promise<PortfolioContext> {
  const context = await getPortfolioContext();
  if (!context) {
    throw new Error("No portfolio access");
  }
  return context;
}

export async function requirePortfolioWriteAccess(): Promise<PortfolioContext> {
  const context = await requirePortfolioContext();
  if (context.viewMode === "aggregate") {
    throw new Error("Aggregate view is read-only");
  }
  if (context.readOnly) {
    throw new Error("Forbidden");
  }
  return context;
}

export async function setActivePortfolio(portfolioId: string): Promise<void> {
  const session = await getSession();
  if (!session.isLoggedIn || typeof session.userId !== "string") {
    throw new Error("Unauthorized");
  }

  const membership = await getPortfolioMembership(portfolioId, session.userId);
  if (!membership) {
    throw new Error("Portfolio not found");
  }

  session.activePortfolioId = portfolioId;
  session.portfolioViewMode = "single";
  session.aggregatePortfolioIds = undefined;
  await session.save();
}

export async function setAggregateView(portfolioIds: string[]): Promise<void> {
  const session = await getSession();
  if (!session.isLoggedIn || typeof session.userId !== "string") {
    throw new Error("Unauthorized");
  }

  const memberships = await listUserPortfolios(session.userId);
  const validIds = portfolioIds.filter((id) =>
    memberships.some((p) => p.id === id),
  );

  if (validIds.length < 2) {
    throw new Error("Select at least two portfolios for aggregate view");
  }

  session.portfolioViewMode = "aggregate";
  session.aggregatePortfolioIds = validIds;
  session.activePortfolioId = validIds[0];
  await session.save();
}

export async function login(
  email: string,
  password: string,
): Promise<boolean> {
  const user = await authenticateUser(email, password);
  if (!user) {
    return false;
  }

  const session = await getSession();
  session.isLoggedIn = true;
  session.userId = user.id;
  session.role = user.role;

  let memberships = await listUserPortfolios(user.id);
  if (memberships.length === 0) {
    const created = await createPortfolio(user.id, "Main");
    memberships = [created];
  }

  session.activePortfolioId = memberships[0].id;
  session.portfolioViewMode = "single";
  session.aggregatePortfolioIds = undefined;
  await session.save();
  return true;
}

export async function logout() {
  const session = await getSession();
  session.destroy();
}
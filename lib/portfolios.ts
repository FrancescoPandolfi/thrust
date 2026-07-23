import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { findUserByEmail } from "@/lib/users";
import {
  portfolioMembers,
  portfolios,
  users,
  type Portfolio,
  type PortfolioRole,
} from "@/lib/schema";

export type PortfolioSummary = {
  id: string;
  name: string;
  role: PortfolioRole;
};

export type PortfolioViewContext = PortfolioSummary & {
  readOnly: boolean;
  viewMode: "single" | "aggregate";
  aggregatePortfolioIds: string[];
};

export type PortfolioMemberRow = {
  userId: string;
  email: string;
  name: string | null;
  role: PortfolioRole;
};

export function canWritePortfolio(role: PortfolioRole): boolean {
  return role === "owner" || role === "admin";
}

export async function listUserPortfolios(
  userId: string,
): Promise<PortfolioSummary[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: portfolios.id,
      name: portfolios.name,
      role: portfolioMembers.role,
    })
    .from(portfolioMembers)
    .innerJoin(portfolios, eq(portfolios.id, portfolioMembers.portfolioId))
    .where(eq(portfolioMembers.userId, userId))
    .orderBy(asc(portfolios.name));

  return rows;
}

export async function getPortfolioMembership(
  portfolioId: string,
  userId: string,
): Promise<PortfolioSummary | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: portfolios.id,
      name: portfolios.name,
      role: portfolioMembers.role,
    })
    .from(portfolioMembers)
    .innerJoin(portfolios, eq(portfolios.id, portfolioMembers.portfolioId))
    .where(
      and(
        eq(portfolioMembers.portfolioId, portfolioId),
        eq(portfolioMembers.userId, userId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function getPortfolioById(
  portfolioId: string,
): Promise<Portfolio | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(portfolios)
    .where(eq(portfolios.id, portfolioId))
    .limit(1);
  return row ?? null;
}

export async function createPortfolio(
  userId: string,
  name: string,
): Promise<PortfolioSummary> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Portfolio name is required");
  }

  const db = getDb();
  const [portfolio] = await db
    .insert(portfolios)
    .values({
      name: trimmed,
      createdByUserId: userId,
    })
    .returning();

  await db.insert(portfolioMembers).values({
    portfolioId: portfolio.id,
    userId,
    role: "owner",
  });

  return {
    id: portfolio.id,
    name: portfolio.name,
    role: "owner",
  };
}

export async function renamePortfolio(
  portfolioId: string,
  name: string,
): Promise<PortfolioSummary> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Portfolio name is required");
  }

  const db = getDb();
  const [portfolio] = await db
    .update(portfolios)
    .set({ name: trimmed, updatedAt: new Date() })
    .where(eq(portfolios.id, portfolioId))
    .returning();

  if (!portfolio) {
    throw new Error("Portfolio not found");
  }

  const membership = await db
    .select({ role: portfolioMembers.role })
    .from(portfolioMembers)
    .where(eq(portfolioMembers.portfolioId, portfolioId))
    .limit(1);

  return {
    id: portfolio.id,
    name: portfolio.name,
    role: membership[0]?.role ?? "viewer",
  };
}

export async function listPortfolioMembers(
  portfolioId: string,
): Promise<PortfolioMemberRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      userId: portfolioMembers.userId,
      email: users.email,
      name: users.name,
      role: portfolioMembers.role,
    })
    .from(portfolioMembers)
    .innerJoin(users, eq(users.id, portfolioMembers.userId))
    .where(eq(portfolioMembers.portfolioId, portfolioId))
    .orderBy(asc(users.email));

  return rows;
}

export async function addPortfolioMember(
  portfolioId: string,
  email: string,
  role: PortfolioRole,
): Promise<PortfolioMemberRow> {
  if (role === "owner") {
    throw new Error("Cannot assign owner role");
  }

  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error("No user found with this email");
  }

  const db = getDb();
  const existing = await getPortfolioMembership(portfolioId, user.id);
  if (existing) {
    throw new Error("User is already a member of this portfolio");
  }

  await db.insert(portfolioMembers).values({
    portfolioId,
    userId: user.id,
    role,
  });

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role,
  };
}

export async function updatePortfolioMemberRole(
  portfolioId: string,
  memberUserId: string,
  role: PortfolioRole,
): Promise<void> {
  if (role === "owner") {
    throw new Error("Cannot assign owner role");
  }

  const db = getDb();
  const [member] = await db
    .select()
    .from(portfolioMembers)
    .where(
      and(
        eq(portfolioMembers.portfolioId, portfolioId),
        eq(portfolioMembers.userId, memberUserId),
      ),
    )
    .limit(1);

  if (!member) {
    throw new Error("Member not found");
  }
  if (member.role === "owner") {
    throw new Error("Cannot change the owner's role");
  }

  await db
    .update(portfolioMembers)
    .set({ role })
    .where(
      and(
        eq(portfolioMembers.portfolioId, portfolioId),
        eq(portfolioMembers.userId, memberUserId),
      ),
    );
}

export async function removePortfolioMember(
  portfolioId: string,
  memberUserId: string,
): Promise<void> {
  const db = getDb();
  const [member] = await db
    .select()
    .from(portfolioMembers)
    .where(
      and(
        eq(portfolioMembers.portfolioId, portfolioId),
        eq(portfolioMembers.userId, memberUserId),
      ),
    )
    .limit(1);

  if (!member) {
    throw new Error("Member not found");
  }
  if (member.role === "owner") {
    throw new Error("Cannot remove the portfolio owner");
  }

  await db
    .delete(portfolioMembers)
    .where(
      and(
        eq(portfolioMembers.portfolioId, portfolioId),
        eq(portfolioMembers.userId, memberUserId),
      ),
    );
}

export async function listAllPortfolios(): Promise<Portfolio[]> {
  const db = getDb();
  return db.select().from(portfolios).orderBy(asc(portfolios.name));
}

export function portfolioRoleLabel(role: PortfolioRole): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "viewer":
      return "Viewer";
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

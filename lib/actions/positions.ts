"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { positions } from "@/lib/schema";
import { resolveYahooSymbol } from "@/lib/ticker-map";

async function requireAuth() {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized");
  }
}

export async function updatePositionShares(id: string, shares: number) {
  await requireAuth();
  const db = getDb();
  await db
    .update(positions)
    .set({ shares: String(shares), updatedAt: new Date() })
    .where(eq(positions.id, id));
  revalidatePath("/");
  revalidatePath("/returns");
}

export async function updatePositionLoadValue(id: string, loadValueEur: number) {
  await requireAuth();
  const db = getDb();
  await db
    .update(positions)
    .set({ loadValueEur: String(loadValueEur), updatedAt: new Date() })
    .where(eq(positions.id, id));
  revalidatePath("/");
}

export async function addPosition(data: {
  googleTicker: string;
  yahooSymbol?: string;
  title: string;
  category: "equity_etf" | "bond_etf" | "crypto";
  shares: number;
  loadValueEur: number;
  isin?: string;
}) {
  await requireAuth();
  const yahooSymbol =
    data.yahooSymbol ?? resolveYahooSymbol(data.googleTicker);
  if (!yahooSymbol) {
    throw new Error("Unable to resolve Yahoo symbol");
  }
  const db = getDb();
  await db.insert(positions).values({
    googleTicker: data.googleTicker,
    yahooSymbol,
    title: data.title,
    category: data.category,
    shares: String(data.shares),
    loadValueEur: String(data.loadValueEur),
    isin: data.isin ?? null,
  });
  revalidatePath("/");
}

export async function deletePosition(id: string) {
  await requireAuth();
  const db = getDb();
  await db.delete(positions).where(eq(positions.id, id));
  revalidatePath("/");
}

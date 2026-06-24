"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { normalizeInstrument } from "@/lib/instruments";
import { positions } from "@/lib/schema";

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
  isin?: string;
  symbol?: string;
  micCode?: string | null;
  yahooSymbol?: string | null;
  coingeckoId?: string | null;
  title: string;
  category: "equity_etf" | "bond_etf" | "crypto";
  shares: number;
  loadValueEur: number;
}) {
  await requireAuth();
  const instrument = normalizeInstrument({
    isin: data.category === "crypto" ? null : (data.isin ?? null),
    micCode: data.category === "crypto" ? null : (data.micCode ?? null),
    symbol: data.category === "crypto" ? (data.symbol ?? null) : null,
    yahooSymbol: data.yahooSymbol ?? null,
    coingeckoId: data.coingeckoId ?? null,
    category: data.category,
  });

  if (data.category === "crypto" && !instrument.symbol) {
    throw new Error("Symbol is required for crypto");
  }
  if (data.category === "crypto" && !instrument.coingeckoId) {
    throw new Error("CoinGecko ID is required for crypto");
  }
  if (data.category !== "crypto" && !instrument.isin) {
    throw new Error("ISIN is required");
  }

  const db = getDb();
  await db.insert(positions).values({
    isin: instrument.isin,
    symbol: instrument.symbol,
    micCode: instrument.micCode,
    yahooSymbol: instrument.yahooSymbol,
    coingeckoId: instrument.coingeckoId,
    title: data.title,
    category: data.category,
    shares: String(data.shares),
    loadValueEur: String(data.loadValueEur),
  });
  revalidatePath("/");
}

export async function deletePosition(id: string) {
  await requireAuth();
  const db = getDb();
  await db.delete(positions).where(eq(positions.id, id));
  revalidatePath("/");
}

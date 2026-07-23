"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requirePortfolioWriteAccess } from "@/lib/auth";
import { recordCapitalFlow } from "@/lib/capital-flows";
import { computePortfolio } from "@/lib/calculations";
import { getDb } from "@/lib/db";
import { formatSharesForStorage } from "@/lib/format";
import { normalizeInstrument, positionToInstrument } from "@/lib/instruments";
import { verifyPositionInActivePortfolio } from "@/lib/portfolio";
import { getQuoteMap } from "@/lib/prices";
import { positions } from "@/lib/schema";

function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number.parseFloat(v);
}

export async function updatePosition(
  id: string,
  data: {
    title: string;
    isin?: string;
    micCode?: string | null;
    symbol?: string;
    coingeckoId?: string | null;
    shares: number;
    loadValueEur: number;
  },
) {
  const context = await requirePortfolioWriteAccess();
  const current = await verifyPositionInActivePortfolio(id);
  if (!current) {
    throw new Error("Position not found");
  }

  const trimmedTitle = data.title.trim();
  if (!trimmedTitle) {
    throw new Error("Title is required");
  }

  const instrument = normalizeInstrument({
    isin: current.category === "crypto" ? null : (data.isin ?? null),
    micCode: current.category === "crypto" ? null : (data.micCode ?? null),
    symbol: current.category === "crypto" ? (data.symbol ?? null) : null,
    yahooSymbol: current.yahooSymbol,
    coingeckoId:
      current.category === "crypto" ? (data.coingeckoId ?? null) : current.coingeckoId,
    category: current.category,
  });

  if (current.category === "crypto" && !instrument.symbol) {
    throw new Error("Symbol is required for crypto");
  }
  if (current.category === "crypto" && !instrument.coingeckoId) {
    throw new Error("CoinGecko ID is required for crypto");
  }
  if (current.category !== "crypto" && !instrument.isin) {
    throw new Error("ISIN is required");
  }

  const loadDelta = data.loadValueEur - toNum(current.loadValueEur);
  const sharesDelta = data.shares - toNum(current.shares);
  if (loadDelta !== 0) {
    await recordCapitalFlow({
      portfolioId: context.id,
      amountEur: loadDelta,
      positionId: id,
      title: trimmedTitle,
      sharesDelta,
    });
  }

  const db = getDb();
  await db
    .update(positions)
    .set({
      title: trimmedTitle,
      isin: instrument.isin,
      symbol: instrument.symbol,
      micCode: instrument.micCode,
      yahooSymbol: instrument.yahooSymbol,
      coingeckoId: instrument.coingeckoId,
      shares: formatSharesForStorage(data.shares),
      loadValueEur: String(data.loadValueEur),
      updatedAt: new Date(),
    })
    .where(eq(positions.id, id));
  revalidatePath("/");
  revalidatePath("/returns");
  revalidatePath("/flows");
  revalidatePath("/settings");
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
  const context = await requirePortfolioWriteAccess();
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
  const [inserted] = await db
    .insert(positions)
    .values({
      portfolioId: context.id,
      isin: instrument.isin,
      symbol: instrument.symbol,
      micCode: instrument.micCode,
      yahooSymbol: instrument.yahooSymbol,
      coingeckoId: instrument.coingeckoId,
      title: data.title,
      category: data.category,
      shares: formatSharesForStorage(data.shares),
      loadValueEur: String(data.loadValueEur),
    })
    .returning({ id: positions.id });

  if (data.loadValueEur !== 0) {
    await recordCapitalFlow({
      portfolioId: context.id,
      amountEur: data.loadValueEur,
      positionId: inserted.id,
      title: data.title,
      sharesDelta: data.shares,
    });
  }

  revalidatePath("/");
  revalidatePath("/returns");
  revalidatePath("/flows");
}

export async function deletePosition(id: string) {
  const context = await requirePortfolioWriteAccess();
  const current = await verifyPositionInActivePortfolio(id);
  if (!current) {
    throw new Error("Position not found");
  }

  const instrument = positionToInstrument(current);
  const quotes = await getQuoteMap([instrument], { refresh: false });
  const { positions: computed } = computePortfolio([current], [], quotes, false);
  const valueEur = computed[0]?.valueEur ?? 0;

  if (valueEur !== 0) {
    await recordCapitalFlow({
      portfolioId: context.id,
      amountEur: -valueEur,
      positionId: id,
      title: current.title,
      sharesDelta: -toNum(current.shares),
    });
  }

  const db = getDb();
  await db.delete(positions).where(eq(positions.id, id));
  revalidatePath("/");
  revalidatePath("/returns");
  revalidatePath("/flows");
}

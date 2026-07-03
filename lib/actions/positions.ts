"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireWriteAccess } from "@/lib/auth";
import { recordCapitalFlow } from "@/lib/capital-flows";
import { computePortfolio } from "@/lib/calculations";
import { getDb } from "@/lib/db";
import { formatSharesForStorage } from "@/lib/format";
import { normalizeInstrument, positionToInstrument } from "@/lib/instruments";
import { getQuoteMap } from "@/lib/prices";
import { positions } from "@/lib/schema";

function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number.parseFloat(v);
}

export async function updatePosition(
  id: string,
  data: { shares: number; loadValueEur: number },
) {
  await requireWriteAccess();
  const db = getDb();
  const [current] = await db
    .select()
    .from(positions)
    .where(eq(positions.id, id))
    .limit(1);
  if (!current) {
    throw new Error("Position not found");
  }

  const loadDelta = data.loadValueEur - toNum(current.loadValueEur);
  const sharesDelta = data.shares - toNum(current.shares);
  if (loadDelta !== 0) {
    await recordCapitalFlow({
      amountEur: loadDelta,
      positionId: id,
      title: current.title,
      sharesDelta,
    });
  }

  await db
    .update(positions)
    .set({
      shares: formatSharesForStorage(data.shares),
      loadValueEur: String(data.loadValueEur),
      updatedAt: new Date(),
    })
    .where(eq(positions.id, id));
  revalidatePath("/");
  revalidatePath("/returns");
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
  await requireWriteAccess();
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
      amountEur: data.loadValueEur,
      positionId: inserted.id,
      title: data.title,
      sharesDelta: data.shares,
    });
  }

  revalidatePath("/");
  revalidatePath("/returns");
}

export async function deletePosition(id: string) {
  await requireWriteAccess();
  const db = getDb();
  const [current] = await db
    .select()
    .from(positions)
    .where(eq(positions.id, id))
    .limit(1);
  if (!current) {
    throw new Error("Position not found");
  }

  const instrument = positionToInstrument(current);
  const quotes = await getQuoteMap([instrument], { refresh: false });
  const { positions: computed } = computePortfolio([current], [], quotes, false);
  const valueEur = computed[0]?.valueEur ?? 0;

  if (valueEur !== 0) {
    await recordCapitalFlow({
      amountEur: -valueEur,
      positionId: id,
      title: current.title,
      sharesDelta: -toNum(current.shares),
    });
  }

  await db.delete(positions).where(eq(positions.id, id));
  revalidatePath("/");
  revalidatePath("/returns");
}

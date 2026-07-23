"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requirePortfolioWriteAccess } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { verifyCashInActivePortfolio } from "@/lib/portfolio";
import { cashBalances } from "@/lib/schema";

export async function updateCashBalance(
  id: string,
  label: string,
  amountEur: number,
) {
  await requirePortfolioWriteAccess();
  const current = await verifyCashInActivePortfolio(id);
  if (!current) {
    throw new Error("Cash balance not found");
  }

  const db = getDb();
  await db
    .update(cashBalances)
    .set({
      label: label.trim(),
      amountEur: String(amountEur),
      updatedAt: new Date(),
    })
    .where(eq(cashBalances.id, id));
  revalidatePath("/");
  revalidatePath("/cash");
}

export async function addCashBalance(label: string, amountEur: number) {
  const context = await requirePortfolioWriteAccess();
  const db = getDb();
  await db.insert(cashBalances).values({
    portfolioId: context.id,
    label: label.trim(),
    amountEur: String(amountEur),
  });
  revalidatePath("/");
  revalidatePath("/cash");
}

export async function deleteCashBalance(id: string) {
  await requirePortfolioWriteAccess();
  const current = await verifyCashInActivePortfolio(id);
  if (!current) {
    throw new Error("Cash balance not found");
  }

  const db = getDb();
  await db.delete(cashBalances).where(eq(cashBalances.id, id));
  revalidatePath("/");
  revalidatePath("/cash");
}

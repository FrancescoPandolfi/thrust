"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { cashBalances } from "@/lib/schema";

async function requireAuth() {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized");
  }
}

export async function updateCashBalance(id: string, amountEur: number) {
  await requireAuth();
  const db = getDb();
  await db
    .update(cashBalances)
    .set({ amountEur: String(amountEur), updatedAt: new Date() })
    .where(eq(cashBalances.id, id));
  revalidatePath("/");
  revalidatePath("/cash");
}

export async function addCashBalance(label: string, amountEur: number) {
  await requireAuth();
  const db = getDb();
  await db.insert(cashBalances).values({
    label,
    amountEur: String(amountEur),
  });
  revalidatePath("/cash");
}

export async function deleteCashBalance(id: string) {
  await requireAuth();
  const db = getDb();
  await db.delete(cashBalances).where(eq(cashBalances.id, id));
  revalidatePath("/cash");
}

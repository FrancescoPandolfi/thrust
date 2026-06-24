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

export async function updateCashBalance(
  id: string,
  label: string,
  amountEur: number,
) {
  await requireAuth();
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
  await requireAuth();
  const db = getDb();
  await db.insert(cashBalances).values({
    label: label.trim(),
    amountEur: String(amountEur),
  });
  revalidatePath("/");
  revalidatePath("/cash");
}

export async function deleteCashBalance(id: string) {
  await requireAuth();
  const db = getDb();
  await db.delete(cashBalances).where(eq(cashBalances.id, id));
  revalidatePath("/");
  revalidatePath("/cash");
}

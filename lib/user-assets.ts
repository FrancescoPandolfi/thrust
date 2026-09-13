import { and, eq } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { cashBalances, realEstateAssets } from "@/lib/schema";

export async function loadUserAssets(userId: string) {
  const db = getDb();
  const [cash, realEstate] = await Promise.all([
    db.select().from(cashBalances).where(eq(cashBalances.userId, userId)),
    db
      .select()
      .from(realEstateAssets)
      .where(eq(realEstateAssets.userId, userId)),
  ]);
  return { cash, realEstate };
}

export async function loadCurrentUserAssets() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { cash: [], realEstate: [] };
  }
  return loadUserAssets(userId);
}

export async function verifyCashOwnedByUser(
  cashId: string,
  userId: string,
): Promise<{ id: string } | null> {
  const db = getDb();
  const [row] = await db
    .select({ id: cashBalances.id })
    .from(cashBalances)
    .where(and(eq(cashBalances.id, cashId), eq(cashBalances.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function verifyRealEstateOwnedByUser(
  assetId: string,
  userId: string,
): Promise<{ id: string } | null> {
  const db = getDb();
  const [row] = await db
    .select({ id: realEstateAssets.id })
    .from(realEstateAssets)
    .where(
      and(eq(realEstateAssets.id, assetId), eq(realEstateAssets.userId, userId)),
    )
    .limit(1);
  return row ?? null;
}

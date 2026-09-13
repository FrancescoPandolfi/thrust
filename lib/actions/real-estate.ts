"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUserWriteAccess } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { realEstateAssets } from "@/lib/schema";
import { verifyRealEstateOwnedByUser } from "@/lib/user-assets";

const NET_WORTH_PATH = "/net-worth";

export async function updateRealEstateAsset(
  id: string,
  label: string,
  valueEur: number,
) {
  const userId = await requireUserWriteAccess();
  const current = await verifyRealEstateOwnedByUser(id, userId);
  if (!current) {
    throw new Error("Real estate asset not found");
  }

  const db = getDb();
  await db
    .update(realEstateAssets)
    .set({
      label: label.trim(),
      valueEur: String(valueEur),
      updatedAt: new Date(),
    })
    .where(eq(realEstateAssets.id, id));
  revalidatePath("/");
  revalidatePath(NET_WORTH_PATH);
}

export async function addRealEstateAsset(label: string, valueEur: number) {
  const userId = await requireUserWriteAccess();
  const db = getDb();
  await db.insert(realEstateAssets).values({
    userId,
    label: label.trim(),
    valueEur: String(valueEur),
  });
  revalidatePath("/");
  revalidatePath(NET_WORTH_PATH);
}

export async function deleteRealEstateAsset(id: string) {
  const userId = await requireUserWriteAccess();
  const current = await verifyRealEstateOwnedByUser(id, userId);
  if (!current) {
    throw new Error("Real estate asset not found");
  }

  const db = getDb();
  await db.delete(realEstateAssets).where(eq(realEstateAssets.id, id));
  revalidatePath("/");
  revalidatePath(NET_WORTH_PATH);
}

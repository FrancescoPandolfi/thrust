"use server";

import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { clearProductionErrors } from "@/lib/errors";

export async function clearProductionErrorsAction(): Promise<{ cleared: number }> {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized");
  }

  const cleared = await clearProductionErrors();
  revalidatePath("/errors");
  return { cleared };
}

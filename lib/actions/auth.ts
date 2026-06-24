"use server";

import { login as doLogin, logout as doLogout } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function loginAction(
  formData: FormData,
): Promise<{ error: string } | { success: true }> {
  const password = formData.get("password")?.toString() ?? "";
  const success = await doLogin(password);
  if (!success) {
    return { error: "Invalid password" };
  }
  return { success: true };
}

export async function logoutAction() {
  await doLogout();
  redirect("/login");
}

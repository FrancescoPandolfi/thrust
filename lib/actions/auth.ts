"use server";

import { redirect } from "next/navigation";
import { login as doLogin, logout as doLogout } from "@/lib/auth";

export async function loginAction(
  formData: FormData,
): Promise<{ error: string } | void> {
  const password = formData.get("password")?.toString() ?? "";
  const success = await doLogin(password);
  if (!success) {
    return { error: "Invalid password" };
  }
  redirect("/");
}

export async function logoutAction() {
  await doLogout();
  redirect("/login");
}

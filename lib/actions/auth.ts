"use server";

import { headers } from "next/headers";
import { login as doLogin, logout as doLogout } from "@/lib/auth";
import {
  clearLoginAttempts,
  getLoginRateLimitStatus,
  recordLoginFailure,
} from "@/lib/rate-limit";
import { redirect } from "next/navigation";

async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return headerList.get("x-real-ip")?.trim() || "unknown";
}

export async function loginAction(
  formData: FormData,
): Promise<{ error: string } | { success: true }> {
  const ip = await getClientIp();
  const { limited, retryAfterSec } = getLoginRateLimitStatus(ip);

  if (limited) {
    const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
    return {
      error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  const password = formData.get("password")?.toString() ?? "";
  const success = await doLogin(password);

  if (!success) {
    recordLoginFailure(ip);
    return { error: "Invalid password" };
  }

  clearLoginAttempts(ip);
  return { success: true };
}

export async function logoutAction() {
  await doLogout();
  redirect("/login");
}

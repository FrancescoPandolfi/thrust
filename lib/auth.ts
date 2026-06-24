import bcrypt from "bcryptjs";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getSessionOptions, type SessionData } from "@/lib/session-config";
import { safeEqual } from "@/lib/secure-compare";

export type { SessionData } from "@/lib/session-config";
export { getSessionOptions } from "@/lib/session-config";

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), getSessionOptions());
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session.isLoggedIn === true;
}

function verifyAppPassword(password: string, appPassword: string): boolean {
  if (appPassword.startsWith("$2")) {
    return bcrypt.compareSync(password, appPassword);
  }

  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return safeEqual(password, appPassword);
}

export async function login(password: string): Promise<boolean> {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) {
    throw new Error("APP_PASSWORD is not configured");
  }

  if (!verifyAppPassword(password, appPassword)) {
    return false;
  }

  const session = await getSession();
  session.isLoggedIn = true;
  await session.save();
  return true;
}

export async function logout() {
  const session = await getSession();
  session.destroy();
}

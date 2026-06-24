import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getSessionOptions, type SessionData } from "@/lib/session-config";
import { authenticateUser } from "@/lib/users";

export type { SessionData } from "@/lib/session-config";
export { getSessionOptions } from "@/lib/session-config";

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), getSessionOptions());
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session.isLoggedIn === true && typeof session.userId === "string";
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  if (!session.isLoggedIn || typeof session.userId !== "string") {
    return null;
  }
  return session.userId;
}

export async function login(
  email: string,
  password: string,
): Promise<boolean> {
  const user = await authenticateUser(email, password);
  if (!user) {
    return false;
  }

  const session = await getSession();
  session.isLoggedIn = true;
  session.userId = user.id;
  await session.save();
  return true;
}

export async function logout() {
  const session = await getSession();
  session.destroy();
}

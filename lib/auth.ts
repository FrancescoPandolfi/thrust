import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getSessionOptions, type SessionData } from "@/lib/session-config";
import type { UserRole } from "@/lib/schema";
import { authenticateUser, findUserById } from "@/lib/users";

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

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const session = await getSession();
  if (!session.isLoggedIn || typeof session.userId !== "string") {
    return null;
  }
  if (session.role) {
    return session.role;
  }

  const user = await findUserById(session.userId);
  if (!user) {
    return null;
  }

  // Role is stored on login; avoid session.save() in Server Components.
  return user.role;
}

export async function requireAuth(): Promise<void> {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized");
  }
}

export async function requireWriteAccess(): Promise<void> {
  await requireAuth();
  const role = await getCurrentUserRole();
  if (role !== "admin") {
    throw new Error("Forbidden");
  }
}

export async function requireAdmin(): Promise<void> {
  await requireWriteAccess();
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
  session.role = user.role;
  await session.save();
  return true;
}

export async function logout() {
  const session = await getSession();
  session.destroy();
}

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { users, type User } from "@/lib/schema";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);
  return user;
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<User | null> {
  const user = await findUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return null;
  }
  return user;
}

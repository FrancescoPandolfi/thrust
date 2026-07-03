import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { users, type User, type UserRole } from "@/lib/schema";

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

export async function findUserById(id: string): Promise<User | undefined> {
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
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

export async function listUsers(): Promise<User[]> {
  const db = getDb();
  return db.select().from(users).orderBy(users.createdAt);
}

export type CreateUserInput = {
  email: string;
  password: string;
  name?: string;
  role: UserRole;
};

export async function createUser(input: CreateUserInput): Promise<User> {
  const db = getDb();
  const [user] = await db
    .insert(users)
    .values({
      email: normalizeEmail(input.email),
      passwordHash: hashPassword(input.password),
      name: input.name?.trim() || null,
      role: input.role,
    })
    .returning();
  return user;
}

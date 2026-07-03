"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createUser, findUserByEmail, listUsers } from "@/lib/users";
import type { UserRole } from "@/lib/schema";

const MIN_PASSWORD_LENGTH = 8;

export type UserListItem = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: string;
};

export type CreateUserResult =
  | { ok: true; user: UserListItem }
  | { ok: false; error: string };

function isUserRole(value: string): value is UserRole {
  return value === "admin" || value === "viewer";
}

export async function listUsersAction(): Promise<UserListItem[]> {
  await requireAdmin();
  const users = await listUsers();
  return users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  }));
}

export async function createUserAction(
  formData: FormData,
): Promise<CreateUserResult> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "viewer");

  if (!email) {
    return { ok: false, error: "Email is required" };
  }
  if (!password) {
    return { ok: false, error: "Password is required" };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    };
  }
  if (!isUserRole(roleRaw)) {
    return { ok: false, error: "Invalid role" };
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return { ok: false, error: "A user with this email already exists" };
  }

  const user = await createUser({
    email,
    password,
    name: name || undefined,
    role: roleRaw,
  });

  revalidatePath("/settings/users");
  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    },
  };
}

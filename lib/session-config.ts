import type { SessionOptions } from "iron-session";
import { getSessionSecret } from "@/lib/env";

export type SessionData = {
  isLoggedIn: boolean;
};

let cachedSessionOptions: SessionOptions | null = null;

export function getSessionOptions(): SessionOptions {
  if (cachedSessionOptions) {
    return cachedSessionOptions;
  }

  cachedSessionOptions = {
    password: getSessionSecret(),
    cookieName: "thrust_session",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 30,
    },
  };

  return cachedSessionOptions;
}

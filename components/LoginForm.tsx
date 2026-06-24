"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoginBackground } from "@/components/LoginBackground";
import { loginAction } from "@/lib/actions/auth";

const LOADING_MS = 2000;

function getLoaderDelay() {
  if (typeof window === "undefined") return 0;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0
    : LOADING_MS;
}

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showLoader, setShowLoader] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    const result = await loginAction(formData);

    if ("error" in result) {
      setError(result.error);
      setPending(false);
      return;
    }

    setShowLoader(true);
    await new Promise((resolve) => window.setTimeout(resolve, getLoaderDelay()));
    router.push("/");
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center px-4">
      <LoginBackground />
      {showLoader ? (
        <div className="login-splash relative flex flex-col items-center gap-5">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
            Thrust
          </h1>
          <div className="login-splash-bar" aria-hidden>
            <div className="login-splash-bar-fill" />
          </div>
          <p className="sr-only" role="status">
            Signing in
          </p>
        </div>
      ) : (
        <div className="relative w-full max-w-sm rounded-xl border border-zinc-800/80 bg-zinc-900/90 p-8 shadow-xl backdrop-blur-sm">
          <h1 className="mb-1 text-2xl font-semibold text-zinc-100">Thrust</h1>
          <p className="mb-6 text-sm text-zinc-400">Sign in to your portfolio</p>
          <form action={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-zinc-400"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder:text-zinc-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-zinc-400"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder:text-zinc-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50"
                placeholder="Enter password"
              />
            </div>
            {error && (
              <p className="text-sm text-rose-400" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="w-full cursor-pointer rounded-lg bg-accent py-2.5 text-sm font-medium text-zinc-950 transition-[filter] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

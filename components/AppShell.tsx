"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth";
import {
  NavigationProgressProvider,
  useNavigationProgress,
} from "@/components/NavigationProgress";
import { PortfolioSwitcher } from "@/components/PortfolioSwitcher";
import type { PortfolioSummary, PortfolioViewContext } from "@/lib/portfolios";
import type { UserRole } from "@/lib/schema";

const NAV = [
  { href: "/", label: "Portfolio" },
  { href: "/cash", label: "Cash" },
  { href: "/returns", label: "Returns" },
  { href: "/flows", label: "Flows" },
  { href: "/settings", label: "Settings" },
];

const ADMIN_NAV = [{ href: "/settings/users", label: "Users" }];

type AppShellNavProps = {
  role: UserRole;
  readOnly: boolean;
  portfolios: PortfolioSummary[];
  portfolioContext: PortfolioViewContext | null;
};

function AppShellNav({
  role,
  readOnly,
  portfolios,
  portfolioContext,
}: AppShellNavProps) {
  const pathname = usePathname();
  const { start } = useNavigationProgress();
  const navItems = role === "admin" ? [...NAV, ...ADMIN_NAV] : NAV;

  return (
    <>
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-4 sm:gap-8">
          <Link
            href="/"
            onClick={() => {
              if (pathname !== "/") start();
            }}
            className="shrink-0 text-lg font-semibold text-accent"
          >
            Thrust
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {navItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    if (!active) start();
                  }}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                    active
                      ? "bg-zinc-800/80 text-accent"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <PortfolioSwitcher
            portfolios={portfolios}
            context={portfolioContext}
          />
          {readOnly && (
            <span className="hidden rounded-md border border-zinc-700 bg-zinc-800/60 px-2.5 py-1 text-xs font-medium text-zinc-400 sm:inline">
              Read-only
            </span>
          )}
          <form action={logoutAction}>
            <button
              type="submit"
              className="cursor-pointer rounded-md bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              Logout
            </button>
          </form>
        </div>
      </div>
      <nav className="flex gap-1 border-t border-zinc-800 px-4 py-2 sm:hidden">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (!active) start();
              }}
              className={`flex-1 rounded-md py-1.5 text-center text-xs font-medium ${
                active ? "bg-zinc-800 text-accent" : "text-zinc-400"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function AppShell({
  children,
  role,
  readOnly,
  portfolios,
  portfolioContext,
}: {
  children: React.ReactNode;
  role: UserRole;
  readOnly: boolean;
  portfolios: PortfolioSummary[];
  portfolioContext: PortfolioViewContext | null;
}) {
  return (
    <NavigationProgressProvider>
      <div className="min-h-full flex flex-col">
        <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur">
          <AppShellNav
            role={role}
            readOnly={readOnly}
            portfolios={portfolios}
            portfolioContext={portfolioContext}
          />
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </NavigationProgressProvider>
  );
}

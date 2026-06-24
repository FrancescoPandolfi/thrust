"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

type NavigationProgressContextValue = {
  start: () => void;
};

const NavigationProgressContext =
  createContext<NavigationProgressContextValue | null>(null);

const SHOW_DELAY_MS = 250;

export function useNavigationProgress() {
  const context = useContext(NavigationProgressContext);
  if (context == null) {
    throw new Error(
      "useNavigationProgress must be used within NavigationProgressProvider",
    );
  }
  return context;
}

function NavigationProgressProviderInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [active, setActive] = useState(false);
  const [visible, setVisible] = useState(false);
  const delayRef = useRef<number | null>(null);

  const clearDelay = useCallback(() => {
    if (delayRef.current != null) {
      window.clearTimeout(delayRef.current);
      delayRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clearDelay();
    setActive(true);
    setVisible(false);
    delayRef.current = window.setTimeout(() => {
      setVisible(true);
      delayRef.current = null;
    }, SHOW_DELAY_MS);
  }, [clearDelay]);

  const stop = useCallback(() => {
    clearDelay();
    setActive(false);
    setVisible(false);
  }, [clearDelay]);

  useEffect(() => {
    stop();
  }, [routeKey, stop]);

  useEffect(() => {
    const onPopState = () => start();
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [start]);

  useEffect(() => clearDelay, [clearDelay]);

  return (
    <NavigationProgressContext.Provider value={{ start }}>
      {children}
      {active && visible ? (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-zinc-800"
          aria-hidden
        >
          <div className="nav-progress-bar h-full w-1/3 bg-accent" />
        </div>
      ) : null}
    </NavigationProgressContext.Provider>
  );
}

export function NavigationProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <NavigationProgressProviderInner>{children}</NavigationProgressProviderInner>
    </Suspense>
  );
}

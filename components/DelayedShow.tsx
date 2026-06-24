"use client";

import { useEffect, useState } from "react";

type Props = {
  children: React.ReactNode;
  delayMs?: number;
};

export function DelayedShow({ children, delayMs = 250 }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  if (!visible) {
    return null;
  }

  return children;
}

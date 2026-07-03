"use client";

import { useState } from "react";
import { formatStoredNumeric } from "@/lib/format";
import { CheckIcon, CopyIcon } from "./icons/ActionIcons";

type Props = {
  value: string;
  decimals: number;
  label: string;
  disabled?: boolean;
};

export function CopyValueButton({
  value,
  decimals,
  label,
  disabled = false,
}: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (disabled) return;
    try {
      await navigator.clipboard.writeText(formatStoredNumeric(value, decimals));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — ignore
    }
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleCopy}
      aria-label={label}
      title={copied ? "Copied" : label}
      className="inline-flex cursor-pointer items-center rounded p-0.5 text-zinc-500 transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {copied ? (
        <CheckIcon className="h-3.5 w-3.5 text-accent" />
      ) : (
        <CopyIcon className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

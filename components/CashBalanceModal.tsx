"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { addCashBalance, updateCashBalance } from "@/lib/actions/cash";
import { parseDecimal } from "@/lib/format";
import type { CashBalance } from "@/lib/schema";

type Props = {
  mode: "add" | "edit";
  balance?: CashBalance;
  onClose: () => void;
};

export function CashBalanceModal({ mode, balance, onClose }: Props) {
  const router = useRouter();
  const formId = useId();
  const labelId = `${formId}-label`;
  const amountId = `${formId}-amount`;

  const [label, setLabel] = useState(balance?.label ?? "");
  const [amount, setAmount] = useState(balance?.amountEur ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const canSave = label.trim() !== "" && amount.trim() !== "";

  function animateClose() {
    setClosing(true);
    window.setTimeout(onClose, 150);
  }

  function requestClose() {
    if (saving || closing) return;
    animateClose();
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        requestClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [saving, closing]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSave) return;

    setSaving(true);
    setError(null);

    try {
      const trimmedLabel = label.trim();
      const parsedAmount = parseDecimal(amount);

      if (mode === "add") {
        await addCashBalance(trimmedLabel, parsedAmount);
      } else if (balance) {
        await updateCashBalance(balance.id, trimmedLabel, parsedAmount);
      }

      router.refresh();
      setSaving(false);
      animateClose();
    } catch {
      setError("Could not save balance. Please try again.");
      setSaving(false);
    }
  }

  const backdropClass = closing ? "modal-backdrop-exit" : "modal-backdrop-enter";
  const panelClass = closing ? "modal-panel-exit" : "modal-panel-enter";
  const title = mode === "add" ? "Add balance" : "Edit balance";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onClick={requestClose}
    >
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm ${backdropClass}`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        className={`relative w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl ${panelClass}`}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={`${formId}-title`} className="text-lg font-semibold text-zinc-100">
          {title}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          {mode === "add"
            ? "Add a cash balance to track liquidity."
            : "Update the label or amount for this balance."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor={labelId} className="mb-1.5 block text-sm font-medium text-zinc-400">
              Label
            </label>
            <input
              id={labelId}
              value={label}
              disabled={saving}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Broker cash"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          <div>
            <label htmlFor={amountId} className="mb-1.5 block text-sm font-medium text-zinc-400">
              Amount EUR
            </label>
            <input
              id={amountId}
              type="text"
              inputMode="decimal"
              value={amount}
              disabled={saving}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0,00"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          {error && (
            <p className="text-sm text-rose-400" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={requestClose}
              className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !canSave}
              className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-medium text-zinc-950 transition-[filter] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : mode === "add" ? "Add" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

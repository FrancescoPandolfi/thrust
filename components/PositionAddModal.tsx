"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { addPosition } from "@/lib/actions/positions";
import { CATEGORY_LABELS } from "@/lib/calculations";
import { parseDecimal } from "@/lib/format";
import type { Category } from "@/lib/schema";

type Props = {
  onClose: () => void;
};

const CATEGORIES: Category[] = ["equity_etf", "bond_etf", "crypto"];

function isCategory(value: string): value is Category {
  return value === "equity_etf" || value === "bond_etf" || value === "crypto";
}

export function PositionAddModal({ onClose }: Props) {
  const router = useRouter();
  const formId = useId();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("equity_etf");
  const [isin, setIsin] = useState("");
  const [micCode, setMicCode] = useState("");
  const [symbol, setSymbol] = useState("");
  const [coingeckoId, setCoingeckoId] = useState("");
  const [shares, setShares] = useState("");
  const [loadValueEur, setLoadValueEur] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const isCrypto = category === "crypto";
  const canSave =
    title.trim() !== "" &&
    shares.trim() !== "" &&
    loadValueEur.trim() !== "" &&
    (isCrypto ? symbol.trim() !== "" && coingeckoId.trim() !== "" : isin.trim() !== "");

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
      await addPosition({
        title: title.trim(),
        category,
        isin: isCrypto ? undefined : isin.trim(),
        micCode: isCrypto ? null : micCode.trim() || null,
        symbol: isCrypto ? symbol.trim() : undefined,
        coingeckoId: isCrypto ? coingeckoId.trim() : null,
        shares: parseDecimal(shares),
        loadValueEur: parseDecimal(loadValueEur),
      });
      router.refresh();
      setSaving(false);
      animateClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not add position. Please try again.",
      );
      setSaving(false);
    }
  }

  const backdropClass = closing ? "modal-backdrop-exit" : "modal-backdrop-enter";
  const panelClass = closing ? "modal-panel-exit" : "modal-panel-enter";

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
        className={`relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl ${panelClass}`}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={`${formId}-title`} className="text-lg font-semibold text-zinc-100">
          Add position
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Add a new holding to the active portfolio. Prices are fetched from ISIN
          or symbol mappings.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor={`${formId}-title`}
              className="mb-1.5 block text-sm font-medium text-zinc-400"
            >
              Title
            </label>
            <input
              id={`${formId}-title`}
              value={title}
              disabled={saving}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Vanguard FTSE All-World"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          <div>
            <label
              htmlFor={`${formId}-category`}
              className="mb-1.5 block text-sm font-medium text-zinc-400"
            >
              Category
            </label>
            <select
              id={`${formId}-category`}
              value={category}
              disabled={saving}
              onChange={(event) => {
                const value = event.target.value;
                if (isCategory(value)) setCategory(value);
              }}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          {isCrypto ? (
            <>
              <div>
                <label
                  htmlFor={`${formId}-symbol`}
                  className="mb-1.5 block text-sm font-medium text-zinc-400"
                >
                  Symbol
                </label>
                <input
                  id={`${formId}-symbol`}
                  value={symbol}
                  disabled={saving}
                  onChange={(event) => setSymbol(event.target.value)}
                  placeholder="BTC"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
              <div>
                <label
                  htmlFor={`${formId}-coingecko`}
                  className="mb-1.5 block text-sm font-medium text-zinc-400"
                >
                  CoinGecko ID
                </label>
                <input
                  id={`${formId}-coingecko`}
                  value={coingeckoId}
                  disabled={saving}
                  onChange={(event) => setCoingeckoId(event.target.value)}
                  placeholder="bitcoin"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label
                  htmlFor={`${formId}-isin`}
                  className="mb-1.5 block text-sm font-medium text-zinc-400"
                >
                  ISIN
                </label>
                <input
                  id={`${formId}-isin`}
                  value={isin}
                  disabled={saving}
                  onChange={(event) => setIsin(event.target.value)}
                  placeholder="IE00BK5BQT80"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm uppercase text-zinc-100 placeholder:text-zinc-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
              <div>
                <label
                  htmlFor={`${formId}-mic`}
                  className="mb-1.5 block text-sm font-medium text-zinc-400"
                >
                  MIC code{" "}
                  <span className="font-normal text-zinc-500">(optional)</span>
                </label>
                <input
                  id={`${formId}-mic`}
                  value={micCode}
                  disabled={saving}
                  onChange={(event) => setMicCode(event.target.value)}
                  placeholder="XETR"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm uppercase text-zinc-100 placeholder:text-zinc-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Exchange MIC for price lookup, e.g. XETR, XAMS, XMIL.
                </p>
              </div>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${formId}-shares`}
                className="mb-1.5 block text-sm font-medium text-zinc-400"
              >
                Shares
              </label>
              <input
                id={`${formId}-shares`}
                type="text"
                inputMode="decimal"
                value={shares}
                disabled={saving}
                onChange={(event) => setShares(event.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            <div>
              <label
                htmlFor={`${formId}-load`}
                className="mb-1.5 block text-sm font-medium text-zinc-400"
              >
                Load value (EUR)
              </label>
              <input
                id={`${formId}-load`}
                type="text"
                inputMode="decimal"
                value={loadValueEur}
                disabled={saving}
                onChange={(event) => setLoadValueEur(event.target.value)}
                placeholder="0,00"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
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
              {saving ? "Adding…" : "Add position"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

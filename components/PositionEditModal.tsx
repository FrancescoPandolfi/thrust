"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { updatePosition } from "@/lib/actions/positions";
import type { ComputedPosition } from "@/lib/calculations";
import { CATEGORY_LABELS } from "@/lib/calculations";
import { CopyValueButton } from "@/components/CopyValueButton";
import { formatEur, formatNumber, parseDecimal, SHARES_DECIMALS } from "@/lib/format";
import type { Category } from "@/lib/schema";

type Props = {
  position: ComputedPosition;
  onClose: () => void;
};

type EditMode = "set" | "adjust";

const CATEGORIES: Category[] = ["equity_etf", "bond_etf", "crypto"];

function isCategory(value: string): value is Category {
  return value === "equity_etf" || value === "bond_etf" || value === "crypto";
}

function formatFieldValue(value: number, decimals: number): string {
  return formatNumber(value, decimals);
}

function computeFinalValue(
  mode: EditMode,
  current: number,
  input: string,
): number {
  const parsed = parseDecimal(input);
  return mode === "set" ? parsed : current + parsed;
}

function ModeToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: EditMode;
  onChange: (mode: EditMode) => void;
  disabled: boolean;
}) {
  return (
    <div className="inline-flex rounded-lg border border-zinc-700 p-0.5 text-xs">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("adjust")}
        className={`cursor-pointer rounded-md px-2 py-1 font-medium transition-colors disabled:cursor-not-allowed ${
          mode === "adjust"
            ? "bg-zinc-700 text-zinc-100"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
      >
        Adjust
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("set")}
        className={`cursor-pointer rounded-md px-2 py-1 font-medium transition-colors disabled:cursor-not-allowed ${
          mode === "set"
            ? "bg-zinc-700 text-zinc-100"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
      >
        Set
      </button>
    </div>
  );
}

function CopyableCurrentValue({
  display,
  rawValue,
  copyDecimals,
  disabled,
  label,
}: {
  display: string;
  rawValue: string;
  copyDecimals: number;
  disabled: boolean;
  label: string;
}) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-xs text-zinc-500">
      <span>
        Current:{" "}
        <span className="font-mono tabular-nums text-zinc-400">{display}</span>
      </span>
      <CopyValueButton
        value={rawValue}
        decimals={copyDecimals}
        label={label}
        disabled={disabled}
      />
    </p>
  );
}

function NumericFieldEditor({
  id,
  label,
  current,
  rawCurrent,
  copyDecimals,
  input,
  mode,
  formatPreview,
  disabled,
  onInputChange,
  onModeChange,
}: {
  id: string;
  label: string;
  current: number;
  rawCurrent: string;
  copyDecimals: number;
  input: string;
  mode: EditMode;
  formatPreview: (value: number) => string;
  disabled: boolean;
  onInputChange: (value: string) => void;
  onModeChange: (mode: EditMode) => void;
}) {
  const finalValue = computeFinalValue(mode, current, input);
  const hasChange = finalValue !== current;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-zinc-400">
          {label}
        </label>
        <ModeToggle mode={mode} onChange={onModeChange} disabled={disabled} />
      </div>

      <CopyableCurrentValue
        display={formatPreview(current)}
        rawValue={rawCurrent}
        copyDecimals={copyDecimals}
        disabled={disabled}
        label={`Copy ${label.toLowerCase()}`}
      />

      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={input}
        disabled={disabled}
        placeholder={mode === "adjust" ? "e.g. 100 or -50" : undefined}
        onChange={(event) => onInputChange(event.target.value)}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono tabular-nums text-zinc-100 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50"
      />

      {mode === "adjust" && (
        <p className="mt-2 text-xs text-zinc-400">
          {hasChange ? (
            <>
              Result:{" "}
              <span className="font-mono tabular-nums text-zinc-200">
                {formatPreview(finalValue)}
              </span>
            </>
          ) : (
            "Enter an amount to add or subtract"
          )}
        </p>
      )}
    </div>
  );
}

export function PositionEditModal({ position, onClose }: Props) {
  const router = useRouter();
  const formId = useId();

  const currentShares = Number.parseFloat(position.shares);
  const currentLoadValue = Number.parseFloat(position.loadValueEur);

  const [title, setTitle] = useState(position.title);
  const [category, setCategory] = useState<Category>(position.category);
  const [isin, setIsin] = useState(position.isin ?? "");
  const [micCode, setMicCode] = useState(position.micCode ?? "");
  const [symbol, setSymbol] = useState(position.symbol ?? "");
  const [coingeckoId, setCoingeckoId] = useState(position.coingeckoId ?? "");
  const [sharesMode, setSharesMode] = useState<EditMode>("adjust");
  const [loadValueMode, setLoadValueMode] = useState<EditMode>("adjust");
  const [shares, setShares] = useState("");
  const [loadValue, setLoadValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const isCrypto = category === "crypto";

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

  function hasMetadataChanges(
    nextCategory: Category,
    nextTitle: string,
    nextIsin: string,
    nextMicCode: string,
    nextSymbol: string,
    nextCoingeckoId: string,
  ): boolean {
    if (nextCategory !== position.category) return true;
    if (nextTitle.trim() !== position.title) return true;
    if (nextCategory === "crypto") {
      return (
        nextSymbol.trim().toUpperCase() !== (position.symbol ?? "").toUpperCase() ||
        nextCoingeckoId.trim() !== (position.coingeckoId ?? "")
      );
    }
    return (
      nextIsin.trim().toUpperCase() !== (position.isin ?? "").toUpperCase() ||
      nextMicCode.trim().toUpperCase() !== (position.micCode ?? "").toUpperCase()
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const nextShares = computeFinalValue(sharesMode, currentShares, shares);
      const nextLoadValue = computeFinalValue(
        loadValueMode,
        currentLoadValue,
        loadValue,
      );
      const nextTitle = title.trim();
      const nextIsin = isin.trim();
      const nextMicCode = micCode.trim();
      const nextSymbol = symbol.trim();
      const nextCoingeckoId = coingeckoId.trim();

      if (!nextTitle) {
        throw new Error("Title is required");
      }
      if (isCrypto) {
        if (!nextSymbol) throw new Error("Symbol is required for crypto");
        if (!nextCoingeckoId) throw new Error("CoinGecko ID is required for crypto");
      } else if (!nextIsin) {
        throw new Error("ISIN is required");
      }

      const changed =
        nextShares !== currentShares ||
        nextLoadValue !== currentLoadValue ||
        hasMetadataChanges(
          category,
          nextTitle,
          nextIsin,
          nextMicCode,
          nextSymbol,
          nextCoingeckoId,
        );

      if (changed) {
        await updatePosition(position.id, {
          title: nextTitle,
          category,
          isin: isCrypto ? undefined : nextIsin,
          micCode: isCrypto ? null : nextMicCode || null,
          symbol: isCrypto ? nextSymbol : undefined,
          coingeckoId: isCrypto ? nextCoingeckoId : null,
          shares: nextShares,
          loadValueEur: nextLoadValue,
        });
        router.refresh();
      }

      setSaving(false);
      animateClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save changes. Please try again.",
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
          Edit position
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Update instrument details, shares, and load value.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
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
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50"
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
                  required
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm uppercase text-zinc-100 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50"
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
                  required
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50"
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
                  required
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm uppercase text-zinc-100 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50"
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
              </div>
            </>
          )}

          <NumericFieldEditor
            id={`${formId}-shares`}
            label="Shares"
            current={currentShares}
            rawCurrent={position.shares}
            copyDecimals={SHARES_DECIMALS}
            input={shares}
            mode={sharesMode}
            formatPreview={(value) => formatNumber(value, SHARES_DECIMALS)}
            disabled={saving}
            onInputChange={setShares}
            onModeChange={(mode) => {
              setSharesMode(mode);
              setShares(
                mode === "set"
                  ? formatFieldValue(currentShares, SHARES_DECIMALS)
                  : "",
              );
            }}
          />

          <NumericFieldEditor
            id={`${formId}-load-value`}
            label="Load value (EUR)"
            current={currentLoadValue}
            rawCurrent={position.loadValueEur}
            copyDecimals={2}
            input={loadValue}
            mode={loadValueMode}
            formatPreview={formatEur}
            disabled={saving}
            onInputChange={setLoadValue}
            onModeChange={(mode) => {
              setLoadValueMode(mode);
              setLoadValue(
                mode === "set"
                  ? formatFieldValue(currentLoadValue, 2)
                  : "",
              );
            }}
          />

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
              disabled={saving}
              className="cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-medium text-zinc-950 transition-[filter] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

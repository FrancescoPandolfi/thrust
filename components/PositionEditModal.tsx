"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
  updatePositionLoadValue,
  updatePositionShares,
} from "@/lib/actions/positions";
import type { ComputedPosition } from "@/lib/calculations";
import { formatEur, formatNumber, parseDecimal } from "@/lib/format";

type Props = {
  position: ComputedPosition;
  onClose: () => void;
};

type EditMode = "set" | "adjust";

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
        onClick={() => onChange("set")}
        className={`rounded-md px-2 py-1 font-medium transition-colors ${
          mode === "set"
            ? "bg-zinc-700 text-zinc-100"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
      >
        Set
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("adjust")}
        className={`rounded-md px-2 py-1 font-medium transition-colors ${
          mode === "adjust"
            ? "bg-zinc-700 text-zinc-100"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
      >
        Adjust
      </button>
    </div>
  );
}

function NumericFieldEditor({
  id,
  label,
  current,
  input,
  mode,
  decimals,
  formatPreview,
  disabled,
  onInputChange,
  onModeChange,
}: {
  id: string;
  label: string;
  current: number;
  input: string;
  mode: EditMode;
  decimals: number;
  formatPreview: (value: number) => string;
  disabled: boolean;
  onInputChange: (value: string) => void;
  onModeChange: (mode: EditMode) => void;
}) {
  const finalValue = computeFinalValue(mode, current, input);
  const hasChange = finalValue !== current;

  function applyDelta(delta: number) {
    const next = parseDecimal(input) + delta;
    onInputChange(formatFieldValue(next, decimals));
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-zinc-400">
          {label}
        </label>
        <ModeToggle mode={mode} onChange={onModeChange} disabled={disabled} />
      </div>

      <p className="mb-2 text-xs text-zinc-500">
        Current: {formatPreview(current)}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => applyDelta(-1)}
          className="shrink-0 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          aria-label={`Subtract 1 from ${label}`}
        >
          −
        </button>
        <input
          id={id}
          value={input}
          disabled={disabled}
          placeholder={mode === "adjust" ? "e.g. 100 or -50" : undefined}
          onChange={(event) => onInputChange(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono tabular-nums text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => applyDelta(1)}
          className="shrink-0 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          aria-label={`Add 1 to ${label}`}
        >
          +
        </button>
      </div>

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
  const sharesId = `${formId}-shares`;
  const loadValueId = `${formId}-load-value`;

  const currentShares = Number.parseFloat(position.shares);
  const currentLoadValue = Number.parseFloat(position.loadValueEur);

  const [sharesMode, setSharesMode] = useState<EditMode>("set");
  const [loadValueMode, setLoadValueMode] = useState<EditMode>("set");
  const [shares, setShares] = useState(position.shares);
  const [loadValue, setLoadValue] = useState(position.loadValueEur);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

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
    setSaving(true);
    setError(null);

    try {
      const nextShares = computeFinalValue(sharesMode, currentShares, shares);
      const nextLoadValue = computeFinalValue(
        loadValueMode,
        currentLoadValue,
        loadValue,
      );

      const updates: Promise<void>[] = [];
      if (nextShares !== currentShares) {
        updates.push(updatePositionShares(position.id, nextShares));
      }
      if (nextLoadValue !== currentLoadValue) {
        updates.push(updatePositionLoadValue(position.id, nextLoadValue));
      }

      if (updates.length > 0) {
        await Promise.all(updates);
        router.refresh();
      }

      setSaving(false);
      animateClose();
    } catch {
      setError("Could not save changes. Please try again.");
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
        className={`relative w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl ${panelClass}`}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={`${formId}-title`} className="text-lg font-semibold text-zinc-100">
          Edit position
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          {position.title}
          {(position.isin ?? position.symbol) && (
            <span className="ml-2 font-mono text-zinc-500">
              {position.symbol ?? position.isin}
            </span>
          )}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <NumericFieldEditor
            id={sharesId}
            label="Shares"
            current={currentShares}
            input={shares}
            mode={sharesMode}
            decimals={6}
            formatPreview={(value) => formatNumber(value, 6)}
            disabled={saving}
            onInputChange={setShares}
            onModeChange={(mode) => {
              setSharesMode(mode);
              setShares(
                mode === "set"
                  ? formatFieldValue(currentShares, 6)
                  : "",
              );
            }}
          />

          <NumericFieldEditor
            id={loadValueId}
            label="Load value (EUR)"
            current={currentLoadValue}
            input={loadValue}
            mode={loadValueMode}
            decimals={2}
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
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

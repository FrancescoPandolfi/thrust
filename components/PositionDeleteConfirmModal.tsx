"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { deletePosition } from "@/lib/actions/positions";
import type { ComputedPosition } from "@/lib/calculations";
import { formatEur } from "@/lib/format";

type Props = {
  position: ComputedPosition;
  onClose: () => void;
};

export function PositionDeleteConfirmModal({ position, onClose }: Props) {
  const router = useRouter();
  const titleId = useId();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  function animateClose() {
    setClosing(true);
    window.setTimeout(onClose, 150);
  }

  function requestClose() {
    if (deleting || closing) return;
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
  }, [deleting, closing]);

  async function handleConfirm() {
    setDeleting(true);
    setError(null);

    try {
      await deletePosition(position.id);
      router.refresh();
      setDeleting(false);
      animateClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not remove position. Please try again.",
      );
      setDeleting(false);
    }
  }

  const backdropClass = closing ? "modal-backdrop-exit" : "modal-backdrop-enter";
  const panelClass = closing ? "modal-panel-exit" : "modal-panel-enter";
  const instrumentLabel = position.symbol ?? position.isin ?? "—";

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
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl ${panelClass}`}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-semibold text-zinc-100">
          Remove position?
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          This will permanently remove{" "}
          <span className="font-medium text-zinc-200">{position.title}</span>{" "}
          <span className="font-mono text-zinc-500">({instrumentLabel})</span>{" "}
          from the portfolio.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Current market value ({formatEur(position.valueEur)}) is recorded as a
          capital outflow so daily returns stay accurate.
        </p>

        {error && (
          <p className="mt-4 text-sm text-rose-400" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={deleting}
            onClick={requestClose}
            className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={handleConfirm}
            className="cursor-pointer rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white transition-[filter] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

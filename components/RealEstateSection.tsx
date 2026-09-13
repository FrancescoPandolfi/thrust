"use client";

import { useState } from "react";
import type { RealEstateAsset } from "@/lib/schema";
import { formatEur } from "@/lib/format";
import { RealEstateModal } from "./RealEstateModal";
import { RealEstateDeleteConfirmModal } from "./RealEstateDeleteConfirmModal";
import { DeleteIconButton, EditIconButton } from "./icons/ActionButtons";
import { PlusIcon } from "./icons/ActionIcons";

type Props = {
  assets: RealEstateAsset[];
  realEstateValueEur: number;
  readOnly?: boolean;
};

type ModalState =
  | { mode: "add" }
  | { mode: "edit"; asset: RealEstateAsset }
  | { mode: "delete"; asset: RealEstateAsset }
  | null;

export function RealEstateSection({
  assets,
  realEstateValueEur,
  readOnly = false,
}: Props) {
  const [modal, setModal] = useState<ModalState>(null);

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div>
            <h2 className="text-sm font-medium text-zinc-200">Real Estate</h2>
            <p className="text-xs text-zinc-500">
              Total: {formatEur(realEstateValueEur)}
            </p>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setModal({ mode: "add" })}
              className="group inline-flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-zinc-950 shadow-[0_0_0_0_rgb(223_255_0/0)] transition-[filter,box-shadow,transform] hover:brightness-95 hover:shadow-[0_0_20px_-4px_rgb(223_255_0/0.55)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <PlusIcon className="h-4 w-4 transition-transform group-hover:rotate-90" />
              Add property
            </button>
          )}
        </div>
        {assets.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-500">
            No properties yet. Add your real estate holdings to include them in
            your net worth.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3">Property</th>
                <th className="px-4 py-3 text-right">Value EUR</th>
                {!readOnly && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr
                  key={asset.id}
                  className="border-b border-zinc-800/60 hover:bg-zinc-800/30"
                >
                  <td className="px-4 py-3 text-zinc-200">{asset.label}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-100">
                    {formatEur(Number.parseFloat(asset.valueEur))}
                  </td>
                  {!readOnly && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <EditIconButton
                          label={`Edit ${asset.label}`}
                          onClick={() => setModal({ mode: "edit", asset })}
                        />
                        <DeleteIconButton
                          label={`Delete ${asset.label}`}
                          onClick={() => setModal({ mode: "delete", asset })}
                        />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!readOnly && modal?.mode === "add" && (
        <RealEstateModal mode="add" onClose={() => setModal(null)} />
      )}
      {!readOnly && modal?.mode === "edit" && (
        <RealEstateModal
          mode="edit"
          asset={modal.asset}
          onClose={() => setModal(null)}
        />
      )}
      {!readOnly && modal?.mode === "delete" && (
        <RealEstateDeleteConfirmModal
          asset={modal.asset}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import type { CashBalance } from "@/lib/schema";
import { formatEur } from "@/lib/format";
import { CashBalanceModal } from "./CashBalanceModal";
import { CashDeleteConfirmModal } from "./CashDeleteConfirmModal";
import { DeleteIconButton, EditIconButton } from "./icons/ActionButtons";
import { PlusIcon } from "./icons/ActionIcons";

type Props = {
  balances: CashBalance[];
};

type ModalState =
  | { mode: "add" }
  | { mode: "edit"; balance: CashBalance }
  | { mode: "delete"; balance: CashBalance }
  | null;

export function CashSection({ balances }: Props) {
  const [modal, setModal] = useState<ModalState>(null);

  const total = balances.reduce(
    (s, b) => s + Number.parseFloat(b.amountEur),
    0,
  );

  return (
    <>
      <div className="space-y-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-400">
            Total liquidity
          </p>
          <p className="mt-1 font-mono text-3xl tabular-nums text-zinc-100">
            {formatEur(total)}
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <h2 className="text-sm font-medium text-zinc-200">Balances</h2>
            <button
              type="button"
              onClick={() => setModal({ mode: "add" })}
              className="group inline-flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-zinc-950 shadow-[0_0_0_0_rgb(223_255_0/0)] transition-[filter,box-shadow,transform] hover:brightness-95 hover:shadow-[0_0_20px_-4px_rgb(223_255_0/0.55)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <PlusIcon className="h-4 w-4 transition-transform group-hover:rotate-90" />
              Add balance
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3 text-right">Amount EUR</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((balance) => (
                <tr
                  key={balance.id}
                  className="border-b border-zinc-800/60 hover:bg-zinc-800/30"
                >
                  <td className="px-4 py-3 text-zinc-200">{balance.label}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-100">
                    {formatEur(Number.parseFloat(balance.amountEur))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <EditIconButton
                        label={`Edit ${balance.label}`}
                        onClick={() => setModal({ mode: "edit", balance })}
                      />
                      <DeleteIconButton
                        label={`Delete ${balance.label}`}
                        onClick={() => setModal({ mode: "delete", balance })}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal?.mode === "add" && (
        <CashBalanceModal mode="add" onClose={() => setModal(null)} />
      )}
      {modal?.mode === "edit" && (
        <CashBalanceModal
          mode="edit"
          balance={modal.balance}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === "delete" && (
        <CashDeleteConfirmModal
          balance={modal.balance}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

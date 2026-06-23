"use client";

import { useState } from "react";
import {
  addCashBalance,
  deleteCashBalance,
  updateCashBalance,
} from "@/lib/actions/cash";
import type { CashBalance } from "@/lib/schema";
import { formatEur, parseDecimal } from "@/lib/format";

type Props = {
  balances: CashBalance[];
};

function EditableAmount({
  id,
  value,
}: {
  id: string;
  value: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateCashBalance(id, parseDecimal(draft));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(String(value));
          setEditing(true);
        }}
        className="font-mono tabular-nums text-zinc-100 hover:text-blue-400"
      >
        {formatEur(value)}
      </button>
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      disabled={saving}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") setEditing(false);
      }}
      className="w-32 rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-right font-mono tabular-nums"
    />
  );
}

export function CashSection({ balances }: Props) {
  const total = balances.reduce(
    (s, b) => s + Number.parseFloat(b.amountEur),
    0,
  );

  async function handleAdd(formData: FormData) {
    const label = formData.get("label")?.toString() ?? "Cash";
    const amount = parseDecimal(formData.get("amount")?.toString() ?? "0");
    await addCashBalance(label, amount);
  }

  return (
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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3 text-right">Amount EUR</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((b) => (
              <tr
                key={b.id}
                className="border-b border-zinc-800/60 hover:bg-zinc-800/30"
              >
                <td className="px-4 py-3 text-zinc-200">{b.label}</td>
                <td className="px-4 py-3 text-right">
                  <EditableAmount
                    id={b.id}
                    value={Number.parseFloat(b.amountEur)}
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => deleteCashBalance(b.id)}
                    className="text-xs text-rose-400 hover:text-rose-300"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={handleAdd} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Label</label>
          <input
            name="label"
            placeholder="Broker cash"
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Amount EUR</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            placeholder="0"
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-white"
        >
          Add balance
        </button>
      </form>
    </div>
  );
}

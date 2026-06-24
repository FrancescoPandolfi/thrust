"use client";

import { useState } from "react";
import { AllocationByTitleChart } from "@/components/charts/AllocationByTitleChart";
import { AllocationDonut } from "@/components/charts/AllocationDonut";
import type { ComputedPosition } from "@/lib/calculations";

type AllocationSlice = { name: string; value: number };

type Mode = "category" | "title";

type Props = {
  allocation: AllocationSlice[];
  positions: ComputedPosition[];
};

const MODES: { id: Mode; label: string }[] = [
  { id: "title", label: "Title" },
  { id: "category", label: "Category" },
];

export function AllocationPanel({ allocation, positions }: Props) {
  const [mode, setMode] = useState<Mode>("title");

  return (
    <div className="flex h-[250px] flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          Allocation
        </h2>
        <div className="flex shrink-0 gap-0.5 rounded-md border border-zinc-800 bg-zinc-950 p-0.5">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              className={`cursor-pointer rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide transition-colors ${
                mode === item.id
                  ? "bg-zinc-800 text-accent"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 min-h-0 flex-1 overflow-hidden">
        {mode === "category" ? (
          <AllocationDonut data={allocation} compact embedded />
        ) : (
          <AllocationByTitleChart positions={positions} embedded />
        )}
      </div>
    </div>
  );
}

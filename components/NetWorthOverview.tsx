"use client";

import { useEffect, useState } from "react";
import { PortfolioMetrics } from "@/components/charts/PortfolioMetrics";
import { EyeIcon, EyeOffIcon } from "@/components/icons/ActionIcons";
import { MetricCard } from "@/components/MetricCard";
import { formatEur } from "@/lib/format";

const STORAGE_KEY = "thrust:net-worth-includes";

type Includes = {
  cash: boolean;
  realEstate: boolean;
};

type Props = {
  positionsValueEur: number;
  cashValueEur: number;
  realEstateValueEur: number;
  totalValueEur: number;
  totalPlEur: number;
  totalPlPct: number;
};

function loadIncludes(): Includes {
  if (typeof window === "undefined") {
    return { cash: true, realEstate: true };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { cash: true, realEstate: true };
    }
    const parsed = JSON.parse(raw) as Partial<Includes>;
    return {
      cash: parsed.cash ?? true,
      realEstate: parsed.realEstate ?? true,
    };
  } catch {
    return { cash: true, realEstate: true };
  }
}

function BreakdownCard({
  label,
  valueEur,
  included,
  onIncludedChange,
  toggleable = false,
  className,
}: {
  label: string;
  valueEur: number;
  included: boolean;
  onIncludedChange?: (included: boolean) => void;
  toggleable?: boolean;
  className?: string;
}) {
  const excluded = toggleable && !included;

  return (
    <div
      className={`rounded-xl border bg-zinc-900 p-4 transition-[opacity,border-color] ${
        excluded ? "border-zinc-800/60" : "border-zinc-800"
      } ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={`text-xs font-medium uppercase tracking-wide ${
            excluded ? "text-zinc-500" : "text-zinc-400"
          }`}
        >
          {label}
        </p>
        {toggleable && onIncludedChange && (
          <button
            type="button"
            onClick={() => onIncludedChange(!included)}
            aria-label={
              included
                ? `Exclude ${label} from net worth`
                : `Include ${label} in net worth`
            }
            aria-pressed={included}
            title={included ? "Exclude from total" : "Include in total"}
            className={`cursor-pointer rounded-md p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
              included
                ? "text-zinc-400 hover:text-zinc-200"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {included ? (
              <EyeIcon className="h-4 w-4" />
            ) : (
              <EyeOffIcon className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      <div className="relative mt-1 w-fit">
        <p
          className={`font-mono text-xl tabular-nums transition-colors ${
            excluded ? "text-zinc-500" : "text-zinc-100"
          }`}
        >
          {formatEur(valueEur)}
        </p>
        {excluded && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-zinc-500"
          />
        )}
      </div>
    </div>
  );
}

export function NetWorthOverview({
  positionsValueEur,
  cashValueEur,
  realEstateValueEur,
  totalValueEur,
  totalPlEur,
  totalPlPct,
}: Props) {
  const [includes, setIncludes] = useState<Includes>({
    cash: true,
    realEstate: true,
  });

  useEffect(() => {
    setIncludes(loadIncludes());
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(includes));
  }, [includes]);

  const netWorthEur =
    positionsValueEur +
    (includes.cash ? cashValueEur : 0) +
    (includes.realEstate ? realEstateValueEur : 0);

  const excludedLabels = [
    !includes.cash && cashValueEur > 0 ? "cash" : null,
    !includes.realEstate && realEstateValueEur > 0 ? "real estate" : null,
  ].filter(Boolean);

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.4fr)] lg:grid-rows-2">
      <MetricCard
        className="flex h-full flex-col justify-center self-stretch lg:row-span-2"
        label="Net Worth"
        value={formatEur(netWorthEur)}
        valueClassName="text-2xl font-bold text-zinc-100"
        hint={
          excludedLabels.length > 0
            ? `Excluding ${excludedLabels.join(" and ")}`
            : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-start-2 lg:row-start-1">
        <BreakdownCard label="Portfolio" valueEur={positionsValueEur} included />
        <BreakdownCard
          label="Cash"
          valueEur={cashValueEur}
          included={includes.cash}
          toggleable
          onIncludedChange={(cash) => setIncludes((prev) => ({ ...prev, cash }))}
        />
        <BreakdownCard
          className="col-span-2 sm:col-span-1"
          label="Real Estate"
          valueEur={realEstateValueEur}
          included={includes.realEstate}
          toggleable
          onIncludedChange={(realEstate) =>
            setIncludes((prev) => ({ ...prev, realEstate }))
          }
        />
      </div>

      <div className="lg:col-start-2 lg:row-start-2">
        <PortfolioMetrics
          totalValueEur={totalValueEur}
          totalPlEur={totalPlEur}
          totalPlPct={totalPlPct}
          includeCashMetric={false}
        />
      </div>
    </div>
  );
}

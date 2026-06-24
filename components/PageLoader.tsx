import { DelayedShow } from "@/components/DelayedShow";

export function PageLoader() {
  return (
    <DelayedShow>
      <div
        className="space-y-6 animate-pulse"
        aria-live="polite"
        aria-busy="true"
        role="status"
      >
        <span className="sr-only">Loading page…</span>
        <div className="h-8 w-48 rounded-lg bg-zinc-800" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="grid h-[250px] grid-cols-2 grid-rows-2 gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="rounded-xl border border-zinc-800 bg-zinc-900"
              />
            ))}
          </div>
          <div className="h-[250px] rounded-xl border border-zinc-800 bg-zinc-900" />
        </div>
        <div className="h-64 rounded-xl border border-zinc-800 bg-zinc-900" />
      </div>
    </DelayedShow>
  );
}

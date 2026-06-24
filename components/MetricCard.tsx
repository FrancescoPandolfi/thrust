type Props = {
  label: string;
  value: string;
  valueClassName?: string;
  labelClassName?: string;
  hint?: string;
  className?: string;
};

export function MetricCard({
  label,
  value,
  valueClassName = "text-zinc-100",
  labelClassName = "text-zinc-400",
  hint,
  className,
}: Props) {
  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-900 p-4 ${className ?? ""}`}
    >
      <p
        className={`text-xs font-medium uppercase tracking-wide ${labelClassName}`}
      >
        {label}
      </p>
      <p className={`mt-1 font-mono text-xl tabular-nums ${valueClassName}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-amber-400">{hint}</p>}
    </div>
  );
}

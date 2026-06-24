/** Italian locale: comma decimals, day-first dates */
export const DISPLAY_LOCALE = "it-IT";

const eurFormatter = new Intl.NumberFormat(DISPLAY_LOCALE, {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdFormatter = new Intl.NumberFormat(DISPLAY_LOCALE, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pctFormatter = new Intl.NumberFormat(DISPLAY_LOCALE, {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatEur(value: number): string {
  return eurFormatter.format(value);
}

export function formatUsd(value: number): string {
  return usdFormatter.format(value);
}

/** Format a decimal ratio (0.05 → "5,00%") */
export function formatPct(value: number): string {
  return pctFormatter.format(value);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat(DISPLAY_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Format percent points (12.5 → "12,5%") */
export function formatPercentPoints(value: number, decimals = 1): string {
  return `${formatNumber(value, decimals)}%`;
}

export function parseDecimal(value: string): number {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDateValue(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}

/** dd/mm/yyyy */
export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? parseDateValue(value) : value;
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/** dd/mm/yyyy, hh:mm:ss */
export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

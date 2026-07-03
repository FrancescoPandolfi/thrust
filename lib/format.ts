/** Italian locale: comma decimals, day-first dates */
export const DISPLAY_LOCALE = "it-IT";

export const SHARES_DECIMALS = 6;

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

/** Compact axis labels (232245 → "232.245 €") */
export function formatEurAxis(value: number): string {
  return new Intl.NumberFormat(DISPLAY_LOCALE, {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

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

/** Stored numeric string for clipboard — trim DB padding without display rounding. */
export function formatStoredNumeric(value: string, decimals: number): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const dot = trimmed.indexOf(".");
  if (dot === -1) return trimmed;

  const intPart = trimmed.slice(0, dot);
  let frac = trimmed.slice(dot + 1);
  if (frac.length > decimals) {
    frac = frac.slice(0, decimals);
  }
  frac = frac.replace(/0+$/, "");
  return frac ? `${intPart}.${frac}` : intPart;
}

/** Format shares for DB storage and clipboard (max 6 decimal places). */
export function formatSharesForStorage(value: number | string): string {
  return formatStoredNumeric(String(value), SHARES_DECIMALS);
}

/** Format percent points (12.5 → "12,5%") */
export function formatPercentPoints(value: number, decimals = 1): string {
  return `${formatNumber(value, decimals)}%`;
}

/** Parse user input in it-IT style (1.234,56) or plain decimals (1234.56). */
export function parseDecimal(value: string): number {
  let trimmed = value.trim().replace(/\s/g, "");
  if (!trimmed) return 0;

  let sign = 1;
  if (trimmed.startsWith("-")) {
    sign = -1;
    trimmed = trimmed.slice(1);
  } else if (trimmed.startsWith("+")) {
    trimmed = trimmed.slice(1);
  }

  const lastComma = trimmed.lastIndexOf(",");
  const lastDot = trimmed.lastIndexOf(".");

  let normalized: string;
  if (lastComma > lastDot) {
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    const afterDot = trimmed.slice(lastDot + 1);
    if (
      lastComma === -1 &&
      trimmed.indexOf(".") === lastDot &&
      /^\d{3}$/.test(afterDot)
    ) {
      normalized = trimmed.replace(/\./g, "");
    } else {
      normalized = trimmed.replace(/,/g, "");
    }
  } else if (lastComma >= 0) {
    normalized = trimmed.replace(",", ".");
  } else {
    normalized = trimmed.replace(/\./g, "");
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? sign * parsed : 0;
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

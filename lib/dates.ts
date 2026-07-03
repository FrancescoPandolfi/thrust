/** Calendar date as yyyy-MM-dd (local calendar, no timezone shift). */
export function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function subDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

export function startOfWeek(date: Date, weekStartsOn: 0 | 1 = 1): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const diff = (start.getDay() - weekStartsOn + 7) % 7;
  start.setDate(start.getDate() - diff);
  return start;
}

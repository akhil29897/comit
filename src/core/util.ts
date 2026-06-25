/** Small, dependency-free helpers shared across the analytics. */

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;

/** Clamp a number into [min, max]. */
export function clamp(n: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, n));
}

/** Round to a fixed number of decimals (default 2). */
export function round(n: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

/** Median of a numeric list. Returns null for an empty list. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2
    : (sorted[mid] as number);
}

/** Sum of a numeric list. */
export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/**
 * Human-friendly duration, e.g. 90_000 → "2 minutes", 270_000_000 → "3 days".
 * Always rounds down to the largest sensible unit.
 */
export function humanizeDuration(ms: number): string {
  if (ms < 0) ms = 0;
  if (ms < MINUTE) return "just now";
  if (ms < HOUR) return plural(Math.floor(ms / MINUTE), "minute");
  if (ms < DAY) return plural(Math.floor(ms / HOUR), "hour");
  if (ms < WEEK) return plural(Math.floor(ms / DAY), "day");
  if (ms < 4 * WEEK) return plural(Math.floor(ms / WEEK), "week");
  if (ms < 365 * DAY) return plural(Math.floor(ms / (30 * DAY)), "month");
  return plural(Math.floor(ms / (365 * DAY)), "year");
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

/** "9 PM", "12 AM", "3 PM" from an hour 0–23. */
export function formatHour(hour: number): string {
  const h = ((hour + 11) % 12) + 1;
  const suffix = hour < 12 ? "AM" : "PM";
  return `${h} ${suffix}`;
}

export const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Group an array by a string key. */
export function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const bucket = map.get(k);
    if (bucket) bucket.push(item);
    else map.set(k, [item]);
  }
  return map;
}

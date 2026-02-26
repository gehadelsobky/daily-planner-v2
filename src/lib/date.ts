import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

const FALLBACK_TIMEZONE = "UTC";

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

export function isValidTimezone(timezone: string): boolean {
  try {
    formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimezone(timezone: string): string {
  return isValidTimezone(timezone) ? timezone : FALLBACK_TIMEZONE;
}

export function toDateOnlyUtc(date: string, timezone: string): Date {
  const zoned = `${date}T00:00:00`;
  const safeTimezone = normalizeTimezone(timezone);

  try {
    const fromZone = fromZonedTime(zoned, safeTimezone);
    if (isValidDate(fromZone)) return fromZone;
  } catch {
    // Fall through to strict UTC parse.
  }

  const parsedUtc = new Date(`${date}T00:00:00Z`);
  if (isValidDate(parsedUtc)) return parsedUtc;

  const today = new Date();
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
}

export function formatDateInTimezone(date: Date, timezone: string): string {
  const safeTimezone = normalizeTimezone(timezone);
  if (!isValidDate(date)) {
    const now = new Date();
    return formatInTimeZone(now, safeTimezone, "yyyy-MM-dd");
  }
  return formatInTimeZone(date, safeTimezone, "yyyy-MM-dd");
}

export function todayInTimezone(timezone: string): string {
  return formatDateInTimezone(new Date(), timezone);
}

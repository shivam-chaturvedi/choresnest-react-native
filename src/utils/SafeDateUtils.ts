import { isValid, format as dateFnsFormat } from 'date-fns';
import { getTimezoneOffset } from 'date-fns-tz';

/**
 * Safely parses a date string or object into a valid Date object.
 * Returns null if the date is invalid.
 */
export const safeParseDate = (date: string | Date | null | undefined): Date | null => {
    if (!date) return null;

    if (date instanceof Date) {
        return isValid(date) ? date : null;
    }

    if (typeof date === 'string') {
        const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) {
            const [, year, month, day] = match;
            const parsed = new Date(Date.UTC(+year, +month - 1, +day));
            return isValid(parsed) ? parsed : null;
        }
    }

    return null;
};

const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

const buildDateFromParts = (dateStr: string, hours = 0, minutes = 0): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split("-").map((part) => parseInt(part, 10));
    if (parts.length !== 3 || parts.some((value) => Number.isNaN(value))) {
        return null;
    }
    const [year, month, day] = parts;
    return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
};

const parseTimeComponents = (time?: string): { hours: number; minutes: number } | null => {
    if (!time || time === "All Day") return null;
    const match = time.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2] || "0", 10);
    const period = match[3].toUpperCase();

    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    return { hours, minutes };
};

/**
 * Parses a date string + optional time in a specific timezone.
 * The input date is treated as a UTC midnight anchor (yyyy-MM-dd) before being zoned.
 */
export const parseDateTimeInZone = (
    dateStr: string | undefined | null,
    timeZone: string = DEFAULT_TIMEZONE,
    timeStr?: string | null
): Date | null => {
    if (!dateStr) return null;
    const timeComp = parseTimeComponents(timeStr ?? undefined);
    const hours = timeComp?.hours ?? 0;
    const minutes = timeComp?.minutes ?? 0;
    const localDate = buildDateFromParts(dateStr, hours, minutes);
    if (!localDate) return null;

    const offset = getTimezoneOffset(timeZone, localDate);
    return new Date(localDate.getTime() - offset);
};

/**
 * Safely formats a date. Returns fallback if invalid.
 */
export const safeFormat = (date: Date | string | number | null | undefined, formatStr: string, fallback: string = ''): string => {
    if (!date) return fallback;
    try {
        const d = new Date(date);
        if (!isValid(d)) return fallback;
        return dateFnsFormat(d, formatStr);
    } catch {
        return fallback;
    }
};

/**
 * Returns a valid date or now if invalid
 */
export const ensureDate = (date: Date | string | null | undefined): Date => {
    const d = safeParseDate(date);
    return d || new Date();
};

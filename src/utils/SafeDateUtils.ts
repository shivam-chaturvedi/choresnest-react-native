import { parseISO, isValid, format as dateFnsFormat } from 'date-fns';

/**
 * Safely parses a date string or object into a valid Date object.
 * Returns null if the date is invalid.
 */
export const safeParseDate = (date: string | Date | null | undefined): Date | null => {
    if (!date) return null;

    try {
        const parsed = typeof date === 'string' ? parseISO(date) : date;
        if (isValid(parsed)) {
            return parsed;
        }
        // Try simple new Date() for non-ISO strings
        const textDate = new Date(date);
        return isValid(textDate) ? textDate : null;
    } catch (e) {
        return null;
    }
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
    } catch (e) {
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

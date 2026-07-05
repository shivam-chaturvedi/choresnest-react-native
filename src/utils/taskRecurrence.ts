export type TaskRecurrenceRule =
    | 'daily'
    | 'weekdays'
    | 'weekends'
    | 'weekly'
    | 'every_x_days'
    | 'monthly'
    | 'yearly'
    | 'custom_days';

export interface TaskRecurrenceSnapshot {
    isRecurring?: boolean;
    recurrenceRule?: string | null;
    recurrenceInterval?: number | null;
    recurrenceDaysOfWeek?: number[] | string | null;
    recurrenceEndDate?: string | null;
    recurrenceOccurrenceLimit?: number | null;
    recurrenceCompletedCount?: number | null;
    recurrenceAnchorDate?: string | null;
    recurrenceSkippedDates?: string[] | string | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const parseTaskDateString = (value?: string | null): Date | null => {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const formatTaskDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const addDays = (date: Date, amount: number): Date => {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
};

const parseNumberArray = (value?: number[] | string | null): number[] => {
    if (Array.isArray(value)) {
        return value.filter(day => Number.isInteger(day) && day >= 0 && day <= 6);
    }

    if (typeof value === 'string' && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parseNumberArray(parsed);
            }
        } catch {
            return [];
        }
    }

    return [];
};

const parseStringArray = (value?: string[] | string | null): string[] => {
    if (Array.isArray(value)) {
        return value.filter(Boolean);
    }

    if (typeof value === 'string' && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parseStringArray(parsed);
            }
        } catch {
            return [];
        }
    }

    return [];
};

export const normalizeTaskRecurrenceRule = (
    value?: string | null,
): TaskRecurrenceRule | undefined => {
    switch (value) {
        case 'daily':
        case 'weekdays':
        case 'weekends':
        case 'weekly':
        case 'every_x_days':
        case 'monthly':
        case 'yearly':
        case 'custom_days':
            return value;
        default:
            return undefined;
    }
};

export const normalizeTaskRecurrenceDays = (
    value?: number[] | string | null,
): number[] => [...new Set(parseNumberArray(value))].sort((a, b) => a - b);

export const normalizeTaskSkippedDates = (
    value?: string[] | string | null,
): string[] => [...new Set(parseStringArray(value))].sort();

export const isTaskRecurring = (task: TaskRecurrenceSnapshot): boolean =>
    Boolean(task.isRecurring && normalizeTaskRecurrenceRule(task.recurrenceRule));

const occursOnDate = (
    date: Date,
    task: TaskRecurrenceSnapshot,
    anchorDate: Date,
): boolean => {
    const rule = normalizeTaskRecurrenceRule(task.recurrenceRule);
    const interval = Math.max(1, task.recurrenceInterval ?? 1);
    const day = date.getDay();
    const diffDays = Math.floor((date.getTime() - anchorDate.getTime()) / MS_PER_DAY);

    switch (rule) {
        case 'daily':
            return diffDays >= 0;
        case 'weekdays':
            return diffDays >= 0 && day >= 1 && day <= 5;
        case 'weekends':
            return diffDays >= 0 && (day === 0 || day === 6);
        case 'weekly':
            return diffDays >= 0 && day === anchorDate.getDay() && diffDays % (interval * 7) === 0;
        case 'every_x_days':
            return diffDays >= 0 && diffDays % interval === 0;
        case 'monthly': {
            const monthDiff =
                (date.getFullYear() - anchorDate.getFullYear()) * 12 +
                (date.getMonth() - anchorDate.getMonth());
            return monthDiff >= 0 && monthDiff % interval === 0 && date.getDate() === anchorDate.getDate();
        }
        case 'yearly':
            return (
                date.getMonth() === anchorDate.getMonth() &&
                date.getDate() === anchorDate.getDate() &&
                date.getFullYear() >= anchorDate.getFullYear()
            );
        case 'custom_days': {
            const days = normalizeTaskRecurrenceDays(task.recurrenceDaysOfWeek);
            return diffDays >= 0 && days.includes(day);
        }
        default:
            return false;
    }
};

const getLimitReached = (
    task: TaskRecurrenceSnapshot,
    completedCount: number,
): boolean => {
    const limit = task.recurrenceOccurrenceLimit ?? undefined;
    return Boolean(limit && completedCount >= limit);
};

export const getNextRecurringTaskDate = (
    currentDateString: string,
    task: TaskRecurrenceSnapshot,
    completedCountOverride?: number,
): string | null => {
    if (!isTaskRecurring(task)) {
        return null;
    }

    const currentDate = parseTaskDateString(currentDateString);
    const anchorDate = parseTaskDateString(task.recurrenceAnchorDate || currentDateString);
    if (!currentDate || !anchorDate) {
        return null;
    }

    const endDate = parseTaskDateString(task.recurrenceEndDate);
    const skippedDates = new Set(normalizeTaskSkippedDates(task.recurrenceSkippedDates));
    const completedCount = completedCountOverride ?? task.recurrenceCompletedCount ?? 0;
    if (getLimitReached(task, completedCount)) {
        return null;
    }

    let cursor = addDays(currentDate, 1);

    for (let attempts = 0; attempts < 800; attempts += 1) {
        if (endDate && cursor > endDate) {
            return null;
        }

        const candidate = formatTaskDateString(cursor);
        if (!skippedDates.has(candidate) && occursOnDate(cursor, task, anchorDate)) {
            return candidate;
        }
        cursor = addDays(cursor, 1);
    }

    return null;
};

export const getRecurringTaskLabel = (task: TaskRecurrenceSnapshot): string | null => {
    const rule = normalizeTaskRecurrenceRule(task.recurrenceRule);
    const interval = Math.max(1, task.recurrenceInterval ?? 1);
    switch (rule) {
        case 'daily':
            return 'Daily';
        case 'weekdays':
            return 'Weekdays';
        case 'weekends':
            return 'Weekends';
        case 'weekly':
            return interval > 1 ? `Every ${interval} weeks` : 'Weekly';
        case 'every_x_days':
            return interval > 1 ? `Every ${interval} days` : 'Daily';
        case 'monthly':
            return interval > 1 ? `Every ${interval} months` : 'Monthly';
        case 'yearly':
            return 'Yearly';
        case 'custom_days': {
            const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const days = normalizeTaskRecurrenceDays(task.recurrenceDaysOfWeek);
            return days.length ? days.map(day => labels[day] || '').filter(Boolean).join(', ') : 'Custom';
        }
        default:
            return null;
    }
};

export const encodeTaskRecurrenceDays = (value?: number[] | null): string | undefined => {
    const days = normalizeTaskRecurrenceDays(value);
    return days.length ? JSON.stringify(days) : undefined;
};

export const encodeTaskSkippedDates = (value?: string[] | null): string | undefined => {
    const dates = normalizeTaskSkippedDates(value);
    return dates.length ? JSON.stringify(dates) : undefined;
};

export const taskOccursOnDateString = (
    targetDateStr: string,
    task: TaskRecurrenceSnapshot & { date?: string; dateString?: string },
): boolean => {
    if (!isTaskRecurring(task)) {
        return false;
    }

    const targetDate = parseTaskDateString(targetDateStr);
    const anchorDate = parseTaskDateString(
        task.recurrenceAnchorDate || task.dateString || task.date || '',
    );
    if (!targetDate || !anchorDate) {
        return false;
    }

    const skippedDates = new Set(normalizeTaskSkippedDates(task.recurrenceSkippedDates));
    if (skippedDates.has(targetDateStr)) {
        return false;
    }

    const endDate = parseTaskDateString(task.recurrenceEndDate);
    if (endDate && targetDate > endDate) {
        return false;
    }

    if (targetDate < anchorDate) {
        return false;
    }

    return occursOnDate(targetDate, task, anchorDate);
};

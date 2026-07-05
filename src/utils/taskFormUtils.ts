import {
    TaskRecurrenceRule,
    formatTaskDateString,
    normalizeTaskRecurrenceRule,
} from './taskRecurrence';

export interface TaskRecurrenceFormValue {
    isRecurring: boolean;
    recurrenceRule?: TaskRecurrenceRule;
    recurrenceInterval?: number;
    recurrenceDaysOfWeek?: number[];
    recurrenceEndDate?: Date | null;
}

export const createDefaultTaskRecurrenceForm = (
    dueDate: Date = new Date(),
): TaskRecurrenceFormValue => ({
    isRecurring: false,
    recurrenceRule: 'weekly',
    recurrenceInterval: 1,
    recurrenceDaysOfWeek: [dueDate.getDay()],
    recurrenceEndDate: null,
});

export const buildTaskRecurrenceWritePayload = (
    form: TaskRecurrenceFormValue,
    formattedDate: string,
    dueDate: Date,
    options?: { includeAnchor?: boolean },
) => {
    if (!form.isRecurring) {
        return {
            isRecurring: false,
            recurrenceRule: undefined,
            recurrenceInterval: undefined,
            recurrenceDaysOfWeek: undefined,
            recurrenceEndDate: undefined,
            recurrenceAnchorDate: undefined,
        };
    }

    const recurrenceRule =
        normalizeTaskRecurrenceRule(form.recurrenceRule) ?? 'weekly';
    const includeAnchor = options?.includeAnchor !== false;

    return {
        isRecurring: true,
        recurrenceRule,
        recurrenceInterval: Math.max(1, form.recurrenceInterval ?? 1),
        recurrenceDaysOfWeek:
            recurrenceRule === 'custom_days'
                ? form.recurrenceDaysOfWeek?.length
                    ? form.recurrenceDaysOfWeek
                    : [dueDate.getDay()]
                : undefined,
        recurrenceEndDate: form.recurrenceEndDate
            ? formatTaskDateString(form.recurrenceEndDate)
            : undefined,
        recurrenceAnchorDate: includeAnchor ? formattedDate : undefined,
    };
};

export const mapTaskToRecurrenceForm = (
    task: {
        isRecurring?: boolean;
        recurrenceRule?: string | null;
        recurrenceInterval?: number | null;
        recurrenceDaysOfWeek?: number[] | string | null;
        recurrenceEndDate?: string | null;
        date?: string;
        dateString?: string;
    },
    fallbackDueDate: Date,
): TaskRecurrenceFormValue => {
    const parseEndDate = (value?: string | null) => {
        if (!value) return null;
        const [year, month, day] = value.split('-').map(Number);
        if (!year || !month || !day) return null;
        return new Date(year, month - 1, day);
    };

    const parseDays = (value?: number[] | string | null): number[] => {
        if (Array.isArray(value)) {
            return value.filter(day => Number.isInteger(day));
        }
        if (typeof value === 'string' && value.trim()) {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed)
                    ? parsed.filter(day => Number.isInteger(day))
                    : [];
            } catch {
                return [];
            }
        }
        return [];
    };

    return {
        isRecurring: Boolean(task.isRecurring),
        recurrenceRule:
            normalizeTaskRecurrenceRule(task.recurrenceRule) ?? 'weekly',
        recurrenceInterval: Math.max(1, task.recurrenceInterval ?? 1),
        recurrenceDaysOfWeek: parseDays(task.recurrenceDaysOfWeek),
        recurrenceEndDate: parseEndDate(task.recurrenceEndDate),
    };
};

import {
    getNextRecurringTaskDate,
    isTaskRecurring,
    type TaskRecurrenceSnapshot,
} from './taskRecurrence';

const applyDefaultMorningTime = (date: Date) => {
    date.setHours(9);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
};

export const getDeviceTimeZone = (): string =>
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export const combineLocalDateAndTime = (datePart: Date, timePart: Date): Date =>
    new Date(
        datePart.getFullYear(),
        datePart.getMonth(),
        datePart.getDate(),
        timePart.getHours(),
        timePart.getMinutes(),
        0,
        0,
    );

export const formatDueDisplayTime = (date: Date): string => {
    const hours24 = date.getHours();
    const minutes = date.getMinutes();
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;
    return `${hours12}:${`${minutes}`.padStart(2, '0')} ${period}`;
};

const buildLocalDateFromDateString = (dateStr: string): Date | null => {
    const dateOnlyMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
        const [, year, month, day] = dateOnlyMatch;
        return new Date(
            Number.parseInt(year, 10),
            Number.parseInt(month, 10) - 1,
            Number.parseInt(day, 10),
            0,
            0,
            0,
            0,
        );
    }

    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed;
};

const parseTimeString = (timeStr: string, date: Date) => {
    const twelveHourMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (twelveHourMatch) {
        let hours = parseInt(twelveHourMatch[1], 10);
        const minutes = parseInt(twelveHourMatch[2], 10);
        const period = twelveHourMatch[3]?.toUpperCase();

        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        date.setHours(hours);
        date.setMinutes(minutes);
        date.setSeconds(0);
        date.setMilliseconds(0);
        return;
    }

    const twentyFourHourMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (twentyFourHourMatch) {
        const hours = parseInt(twentyFourHourMatch[1], 10);
        const minutes = parseInt(twentyFourHourMatch[2], 10);
        date.setHours(hours);
        date.setMinutes(minutes);
        date.setSeconds(0);
        date.setMilliseconds(0);
        return;
    }

    applyDefaultMorningTime(date);
};

export const parseReminderDateTime = (dateStr: string, timeStr?: string): Date | null => {
    if (!dateStr) return null;

    const date = buildLocalDateFromDateString(dateStr);
    if (!date || isNaN(date.getTime())) return null;

    if (timeStr && timeStr !== 'All Day') {
        parseTimeString(timeStr, date);
    } else {
        applyDefaultMorningTime(date);
    }

    return date;
};

export type TaskReminderSource = TaskRecurrenceSnapshot & {
    dateString: string;
    dueDisplay?: string | null;
};

export const resolveNextTaskReminderDateTime = (
    task: TaskReminderSource,
    now: Date = new Date(),
): Date | null => {
    if (!task.dateString) {
        return null;
    }

    const scheduleForDate = (dateString: string): Date | null => {
        const trigger = parseReminderDateTime(dateString, task.dueDisplay || undefined);
        if (!trigger || trigger.getTime() <= now.getTime()) {
            return null;
        }
        return trigger;
    };

    const currentTrigger = scheduleForDate(task.dateString);
    if (currentTrigger) {
        return currentTrigger;
    }

    if (!isTaskRecurring(task)) {
        return null;
    }

    let cursor = task.dateString;
    for (let attempt = 0; attempt < 400; attempt += 1) {
        const nextDate = getNextRecurringTaskDate(cursor, task);
        if (!nextDate || nextDate === cursor) {
            break;
        }
        cursor = nextDate;
        const nextTrigger = scheduleForDate(cursor);
        if (nextTrigger) {
            return nextTrigger;
        }
    }

    return null;
};

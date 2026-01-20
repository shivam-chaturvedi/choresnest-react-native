import { addDays, addMonths, addWeeks, addYears, differenceInDays, format, isAfter, isBefore, isSameDay, parseISO, startOfDay } from "date-fns";
import { CalendarEvent, Task } from "../contexts/FamilyContext";

export type CalendarItem = (CalendarEvent | Task) & {
    isVirtual?: boolean; // True if this is a recurring instance
    originalDate?: string; // The original start date of the recurrence
};

/**
 * Returns all events and tasks that should be displayed on a specific date,
 * handling multi-day events and recurrence.
 */
export const getEventsForDate = (
    date: Date,
    events: CalendarEvent[],
    tasks: Task[]
): CalendarItem[] => {
    const targetDateStr = format(date, "yyyy-MM-dd");
    const targetDate = startOfDay(date);

    const result: CalendarItem[] = [];

    // Process Tasks (Simple date match)
    tasks.forEach(task => {
        if (task.date === targetDateStr && task.status !== 'done') {
            result.push({
                ...task,
                type: 'task', // explicit type for UI
                time: task.due && task.due.match(/\d+:\d+\s*(AM|PM)/i) ? task.due : "All Day",
                memberId: task.assignee,
                // Adapt task fields to match CalendarEvent structure where needed
                coordinates: undefined,
                location: undefined
            } as any);
        }
    });

    // Process Events
    events.forEach(event => {
        const eventStartDate = parseISO(event.date);
        const eventEndDate = event.endDate ? parseISO(event.endDate) : eventStartDate;
        const recurrenceEnd = event.recurrenceEndDate ? parseISO(event.recurrenceEndDate) : null;

        // 1. Single Instance / Multi-day check (Non-recurring)
        if (!event.isRecurring) {
            // Check if target date is within [start, end]
            // using string comparison for safety or date comparison
            if (
                (isSameDay(targetDate, eventStartDate) || isAfter(targetDate, eventStartDate)) &&
                (isSameDay(targetDate, eventEndDate) || isBefore(targetDate, eventEndDate))
            ) {
                result.push(event);
            }
            return;
        }

        // 2. Recurrence Check
        if (event.isRecurring && event.recurrenceRule) {
            // If target date is before start date, ignore
            if (isBefore(targetDate, startOfDay(eventStartDate))) return;

            // If recurrence has an end date, and target is after it, ignore
            if (recurrenceEnd && isAfter(targetDate, startOfDay(recurrenceEnd))) return;

            // Check specific rules
            let isMatch = false;

            switch (event.recurrenceRule) {
                case 'daily':
                    isMatch = true;
                    break;
                case 'weekly':
                    isMatch = isSameDayOfWeek(targetDate, eventStartDate);
                    break;
                case 'biweekly':
                    // Check if difference in weeks is even
                    const diffDays = differenceInDays(targetDate, eventStartDate);
                    const diffWeeks = Math.floor(diffDays / 7);
                    isMatch = diffDays % 14 === 0 || (isSameDayOfWeek(targetDate, eventStartDate) && diffWeeks % 2 === 0);
                    // Simple biweekly: needs to be same day of week AND even number of weeks apart
                    isMatch = isSameDayOfWeek(targetDate, eventStartDate) && (Math.floor(differenceInDays(targetDate, eventStartDate) / 7) % 2 === 0);
                    break;
                case 'monthly':
                    isMatch = targetDate.getDate() === eventStartDate.getDate();
                    break;
                case 'yearly':
                    isMatch = targetDate.getMonth() === eventStartDate.getMonth() && targetDate.getDate() === eventStartDate.getDate();
                    break;
                case 'weekday':
                    const day = targetDate.getDay();
                    isMatch = day !== 0 && day !== 6; // Mon-Fri
                    break;
            }

            if (isMatch) {
                // Create a virtual instance
                result.push({
                    ...event,
                    isVirtual: true,
                    originalDate: event.date,
                    // If it's a recurring event, we usually assume the 'date' field in the UI 
                    // should reflect the TARGET date for display purposes.
                    date: targetDateStr,
                    // Recurrence logic for multi-day recurring events is complex (start date shifts, end date shifts).
                    // For now, assuming distinct occurrences specific to the start date.
                });
            }
        }
    });

    return result;
};

function isSameDayOfWeek(d1: Date, d2: Date) {
    return d1.getDay() === d2.getDay();
}

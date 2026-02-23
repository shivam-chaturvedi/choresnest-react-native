import { differenceInDays, isAfter, isBefore, isSameDay, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { safeFormatInTimeZone, safeTimeZone, parseDateTimeInZone } from "./SafeDateUtils";
import { CalendarEvent, Task } from "../contexts/FamilyContext";

export interface CalendarEventWithMeta extends CalendarEvent {
    __cachedStart?: Date;
    __cachedEnd?: Date;
    __cachedRecurrenceEnd?: Date | null;
}

const getEventStartDate = (event: CalendarEventWithMeta, fallbackZone: string): Date | null => {
    if (event.__cachedStart) return event.__cachedStart;
    const zone = safeTimeZone(event.timeZone, fallbackZone);
    const parsed = parseDateTimeInZone(event.date, zone, event.time && event.time !== "All Day" ? event.time : undefined);
    if (parsed) {
        event.__cachedStart = parsed;
    }
    return parsed;
};

const getEventTimeZone = (event: CalendarEventWithMeta, fallbackZone: string): string => {
    return safeTimeZone(event.timeZone, fallbackZone);
};

const getEventEndDate = (event: CalendarEventWithMeta, eventTimeZone: string, fallback: Date): Date => {
    if (event.__cachedEnd) return event.__cachedEnd;
    const endTimeCandidate = event.endTime && event.endTime !== "All Day" ? event.endTime : event.time && event.time !== "All Day" ? event.time : undefined;
    const parsedEnd = event.endDate
        ? parseDateTimeInZone(event.endDate, eventTimeZone, endTimeCandidate)
        : null;
    const resolved = parsedEnd || fallback;
    event.__cachedEnd = resolved;
    return resolved;
};

const getRecurrenceEnd = (event: CalendarEventWithMeta, eventTimeZone: string): Date | null => {
    if (event.__cachedRecurrenceEnd !== undefined) return event.__cachedRecurrenceEnd;
    if (!event.recurrenceEndDate) {
        event.__cachedRecurrenceEnd = null;
        return null;
    }
    const parsed = parseDateTimeInZone(event.recurrenceEndDate, eventTimeZone);
    event.__cachedRecurrenceEnd = parsed;
    return parsed;
};

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
    events: CalendarEventWithMeta[],
    tasks: Task[],
    timeZone: string
): CalendarItem[] => {
    const safeZone = safeTimeZone(timeZone);
    const targetZoned = toZonedTime(date, safeZone);
    const baseTargetDate = startOfDay(targetZoned);
    const baseTargetDateStr = safeFormatInTimeZone(targetZoned, safeZone, "yyyy-MM-dd");
    const targetDateStr = baseTargetDateStr;

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
        const eventTimeZone = getEventTimeZone(event, safeZone);
        const eventStartDate = getEventStartDate(event, safeZone);
        if (!eventStartDate) return;

        const eventEndDate = getEventEndDate(event, eventTimeZone, eventStartDate);
        const recurrenceEnd = getRecurrenceEnd(event, eventTimeZone);
        const targetDateStr = safeFormatInTimeZone(date, eventTimeZone, "yyyy-MM-dd");
        const targetDate = startOfDay(toZonedTime(date, eventTimeZone));
        const eventStartZoned = eventStartDate;
        const eventEndZoned = eventEndDate;
        const recurrenceEndZoned = recurrenceEnd;

        // 1. Single Instance / Multi-day check (Non-recurring)
        if (!event.isRecurring) {
            // Check if target date is within [start, end]
            // using string comparison for safety or date comparison
            const startString = safeFormatInTimeZone(eventStartZoned, eventTimeZone, "yyyy-MM-dd");
            const endString = safeFormatInTimeZone(eventEndZoned, eventTimeZone, "yyyy-MM-dd");

            if (targetDateStr >= startString && targetDateStr <= endString) {
                result.push(event);
            }
            return;
        }

        // 2. Recurrence Check
        if (event.isRecurring && event.recurrenceRule) {
            // If target date is before start date, ignore
            if (isBefore(targetDate, startOfDay(eventStartZoned))) return;

            if (recurrenceEndZoned && isAfter(targetDate, startOfDay(recurrenceEndZoned))) return;

            // Check specific rules
            let isMatch = false;

            switch (event.recurrenceRule) {
                case 'hourly':
                    // Hourly events repeat every hour, so we generate 24 occurrences per day (one for each hour)
                    // Check if target date is within the recurrence period
                    if (eventEndZoned && isAfter(targetDate, eventEndZoned)) {
                        return; // Skip if past recurrence end
                    }
                    if (isBefore(targetDate, eventStartZoned)) {
                        return; // Skip if before start date
                    }

                    // Parse the original event time to preserve minutes
                    let minutes = 0;
                    const originalTime = event.time;
                    if (originalTime && originalTime !== "All Day") {
                        const timeMatch = originalTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
                        if (timeMatch) {
                            minutes = parseInt(timeMatch[2] || "0", 10);
                        }
                    }

                    // Generate 24 hourly occurrences for this day
                    for (let hour = 0; hour < 24; hour++) {
                        const period = hour >= 12 ? "PM" : "AM";
                        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                        const timeStr = `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
                        
                        result.push({
                            ...event,
                            isVirtual: true,
                            originalDate: event.date,
                            date: targetDateStr,
                            time: timeStr,
                            id: `${event.id}_${targetDateStr}_${hour}`, // Unique ID for each occurrence
                        });
                    }
                    return; // Skip the default isMatch logic for hourly
                case 'daily':
                    isMatch = true;
                    break;
                case 'weekly':
                    isMatch = isSameDayOfWeek(targetDate, startOfDay(eventStartZoned));
                    break;
                case 'biweekly':
                    // Check if difference in weeks is even
                    const diffDays = differenceInDays(targetDate, startOfDay(eventStartZoned));
                    const diffWeeks = Math.floor(diffDays / 7);
                    isMatch = diffDays % 14 === 0 || (isSameDayOfWeek(targetDate, eventStartDate) && diffWeeks % 2 === 0);
                    // Simple biweekly: needs to be same day of week AND even number of weeks apart
                    isMatch = isSameDayOfWeek(targetDate, startOfDay(eventStartZoned)) && (Math.floor(differenceInDays(targetDate, startOfDay(eventStartZoned)) / 7) % 2 === 0);
                    break;
                case 'monthly':
                    isMatch = targetDate.getDate() === startOfDay(eventStartZoned).getDate();
                    break;
                case 'yearly':
                    const startDay = startOfDay(eventStartZoned);
                    isMatch = targetDate.getMonth() === startDay.getMonth() && targetDate.getDate() === startDay.getDate();
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

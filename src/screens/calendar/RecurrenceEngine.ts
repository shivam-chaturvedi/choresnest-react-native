import { addMonths, addYears, addDays, startOfDay, isAfter } from "date-fns";
import { parseDateTimeInZone } from "../../utils/SafeDateUtils";
import { CalendarListEntry } from "./types";

const advanceRecurrenceDate = (date: Date, rule: string): Date | null => {
  switch (rule) {
    case "daily":
      return addDays(date, 1);
    case "weekly":
      return addDays(date, 7);
    case "biweekly":
      return addDays(date, 14);
    case "monthly":
      return addMonths(date, 1);
    case "yearly":
      return addYears(date, 1);
    case "weekday": {
      let next = addDays(date, 1);
      while (next.getDay() === 0 || next.getDay() === 6) {
        next = addDays(next, 1);
      }
      return next;
    }
    default:
      return null;
  }
};

export const getNextRecurringOccurrence = (event: CalendarListEntry & { isRecurring?: boolean; recurrenceRule?: string; recurrenceEndDate?: string }, reference: Date, fallbackTimeZone: string): Date | null => {
  if (!event.isRecurring || !event.recurrenceRule) return null;
  const eventTimeZone = event.timeZone || fallbackTimeZone;
  const start = parseDateTimeInZone(event.date, eventTimeZone, event.time);
  if (!start) return null;
  const recurrenceEnd = event.recurrenceEndDate ? parseDateTimeInZone(event.recurrenceEndDate, eventTimeZone) : null;

  let candidateDate = startOfDay(start);
  const limit = 500;

  for (let i = 0; i < limit; i += 1) {
    if (recurrenceEnd && isAfter(candidateDate, startOfDay(recurrenceEnd))) return null;
    const candidateDateTime = parseDateTimeInZone(candidateDate.toISOString().split('T')[0], eventTimeZone, event.time);
    if (candidateDateTime && candidateDateTime > reference) {
      return candidateDateTime;
    }
    const nextDate = advanceRecurrenceDate(candidateDate, event.recurrenceRule);
    if (!nextDate) break;
    candidateDate = nextDate;
  }
  return null;
};

export const getNextCandidateForEntry = (entry: CalendarListEntry, reference: Date, fallbackTimeZone: string): Date | null => {
  const entryTimeZone = entry.timeZone || fallbackTimeZone;
  const baseDate = parseDateTimeInZone(entry.date, entryTimeZone, entry.time);
  if (!baseDate) return null;

  if (entry.type === "event" && entry.isRecurring) {
    const recurring = getNextRecurringOccurrence(entry, reference, entryTimeZone);
    if (recurring) return recurring;
  }

  if (baseDate > reference) return baseDate;
  return null;
};

import { CalendarEvent, Task } from "../../contexts/FamilyContext";

export type CalendarListEntry =
  | (CalendarEvent & { type: 'event'; isVirtual?: boolean; originalDate?: string; timeZone?: string })
  | (Pick<Task, 'id' | 'icon' | 'date' | 'priority'> & { type: 'task'; title: string; time: string; memberId?: string; timeZone?: string });

export type UpcomingEntry = CalendarListEntry & { nextDate: Date };

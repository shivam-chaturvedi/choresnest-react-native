/**
 * Calendar recurring instances use synthetic ids such as:
 * - `{recordId}_2026-07-05`
 * - `{recordId}_2026-07-05_14` (hourly events)
 */
export const parseVirtualCalendarOccurrenceDate = (id: string): string | null => {
  if (!id) {
    return null;
  }

  const match = id.match(/_(\d{4}-\d{2}-\d{2})(?:_\d+)?$/);
  return match?.[1] ?? null;
};

export const isVirtualCalendarId = (id: string): boolean =>
  Boolean(parseVirtualCalendarOccurrenceDate(id));

export const normalizeVirtualCalendarId = (id: string): string => {
  if (!id) {
    return id;
  }

  const match = id.match(/^(.+?)_\d{4}-\d{2}-\d{2}(?:_|$)/);
  return match?.[1] ?? id;
};

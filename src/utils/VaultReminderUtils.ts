export interface VaultReminderRule {
  field: string;
  offsets: number[];
  timeOfDay?: string;
}

export const REMINDER_OFFSET_OPTIONS = [1, 3, 7, 14, 30];

const FIELD_BY_CATEGORY: Record<string, string> = {
  warranty: 'warrantyTillDate',
  bill: 'billDate',
  insurance: 'expiryDate',
  service: 'nextServiceDate',
};

export const getPrimaryReminderField = (category: string | null | undefined): string | null => {
  if (!category) return null;
  return FIELD_BY_CATEGORY[category] || 'date';
};

export const normalizeReminderOffsets = (offsets: number[]): number[] =>
  Array.from(new Set(offsets.filter(offset => Number.isFinite(offset) && offset > 0))).sort((a, b) => a - b);

export const normalizeReminderTime = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return undefined;
  if (hours < 0) hours = 0;
  if (hours > 23) hours = 23;
  const safeMinutes = Math.min(Math.max(minutes, 0), 59);
  return `${hours.toString().padStart(2, '0')}:${safeMinutes.toString().padStart(2, '0')}`;
};

export const formatReminderRuleSummary = (rule?: VaultReminderRule): string => {
  if (!rule || !rule.offsets || rule.offsets.length === 0) return 'No reminders';
  const offsets = rule.offsets.map(offset => `${offset} day${offset === 1 ? '' : 's'}`);
  const offsetText = offsets.join(', ');
  if (rule.timeOfDay) {
    return `Reminder: ${offsetText} before at ${rule.timeOfDay}`;
  }
  return `Reminder: ${offsetText} before`;
};

export const formatReminderRulesSummary = (rules?: VaultReminderRule[]): string => {
  if (!rules || rules.length === 0) return 'No reminders configured';
  return rules.map(rule => formatReminderRuleSummary(rule)).join('\n');
};

import notifee, { AndroidImportance, AndroidNotificationSetting, TriggerType, TimestampTrigger, RepeatFrequency } from '@notifee/react-native';
import { Platform } from 'react-native';
import { getDatabase } from '../database';
import { Q } from '@nozbe/watermelondb';
import Event from '../database/models/Event';
import Task from '../database/models/Task';
import Document from '../database/models/Document';
import Member from '../database/models/Member';
import { NotificationPreferencesService } from './NotificationPreferencesService';
import { parseReminderDateTime } from '../utils/ReminderDateTimeUtils';
import { checkPermission, requestPermission } from '../utils/permissions';
import { NotificationCenter, NotificationRoute } from './NotificationCenter';
import { AppIconName } from '../components/ui/AppIcon';
import { ProfileService } from './ProfileService';

/**
 * NotificationScheduler
 * 
 * Centralized service for scheduling, cancelling, and managing all notifications.
 * Works with Notifee to create system-level notifications that fire even when app is closed.
 * 
 * Key Principles:
 * - Schedule notifications ONLY when data changes
 * - Store notificationId in database for cancellation
 * - Never read database in background
 * - Respect user preferences and quiet hours
 * - Use AlarmManager on Android for reliability
 */

export type NotificationCategory = 'events' | 'tasks' | 'documents' | 'meals' | 'budgets';

interface NotificationData {
    title: string;
    body: string;
    data?: Record<string, any>;
}

interface QuietHours {
    enabled: boolean;
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
}

const SOUND_NAME = 'reminder';

/**
 * Android 8+ ties notification sound and vibration settings to the channel.
 * To respect the user's sound toggle without mutating existing channels, we create
 * two channels (sound on vs. silent) and select the correct one when dispatching a notification.
 */

const SOUND_CHANNELS = {
    SOUND_ON: {
        id: 'chat_sound_on',
        name: 'Chores Nest (Sound)',
        importance: AndroidImportance.HIGH,
        sound: SOUND_NAME,
        vibration: true,
    },
    SOUND_OFF: {
        id: 'chat_sound_off',
        name: 'Chores Nest (Silent)',
        importance: AndroidImportance.LOW,
        vibration: false,
    },
} as const;

const soundChannelList = Object.values(SOUND_CHANNELS);
let soundChannelsInitialized = false;

const ensureSoundChannelsCreated = async (): Promise<void> => {
    if (soundChannelsInitialized) {
        return;
    }

    await Promise.all(
        soundChannelList.map(channel =>
            notifee.createChannel({
                id: channel.id,
                name: channel.name,
                importance: channel.importance,
                ...(('sound' in channel) && { sound: channel.sound }),
                vibration: channel.vibration,
            })
        )
    );

    soundChannelsInitialized = true;
};

const getChannelIdBySoundPreference = (soundEnabled: boolean): string => {
    return soundEnabled ? SOUND_CHANNELS.SOUND_ON.id : SOUND_CHANNELS.SOUND_OFF.id;
};

const CATEGORY_META: Record<NotificationCategory, { label: string; icon: AppIconName; tone: string; textColor: string }> = {
    events: { label: 'Event', icon: 'calendar', tone: 'rgba(59,130,246,0.2)', textColor: '#2563eb' },
    tasks: { label: 'Task', icon: 'checkSquare', tone: 'rgba(34,197,94,0.2)', textColor: '#22C55E' },
    documents: { label: 'Document', icon: 'file', tone: 'rgba(16,185,129,0.2)', textColor: '#10B981' },
    meals: { label: 'Meal prep', icon: 'utensils', tone: 'rgba(245,158,11,0.2)', textColor: '#F59E0B' },
    budgets: { label: 'Budget', icon: 'wallet', tone: 'rgba(14,165,233,0.2)', textColor: '#0EA5E9' },
};

const ROUTE_FOR_CATEGORY: Record<NotificationCategory, NotificationRoute> = {
    events: { tab: 'calendar' },
    tasks: { tab: 'more', screen: 'Tasks' },
    documents: { tab: 'home', screen: 'Vault' },
    meals: { tab: 'home', screen: 'MealPlan' },
    budgets: { tab: 'more', screen: 'Expenses' },
};

export type RepeatType =
    | 'none'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'biweekly'
    | 'weekday'
    | 'monthly'
    | 'yearly'
    | 'custom';

export interface RepeatMeta {
    daysOfWeek?: number[];
    interval?: number;
    dates?: string[];
}

const describeRepeat = (repeatType: RepeatType) => {
    if (repeatType === 'none') return '';
    return ` (Repeat: ${repeatType})`;
};
const formatShortDateTime = (date: Date): string => {
    return date.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

const formatTimeUntil = (target: Date): string | null => {
    const now = Date.now();
    const diffMs = target.getTime() - now;
    if (diffMs <= 0) {
        return null;
    }
    const minutes = Math.round(diffMs / 60000);
    if (minutes < 1) return 'in less than a minute';
    if (minutes < 60) return `in ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
        return `in ${hours} hr${hours === 1 ? '' : 's'}`;
    }
    return `in ${hours} hr${hours === 1 ? '' : 's'} ${remainingMinutes} min`;
};

const buildEventNotificationBody = (event: Event, startDate: Date): string => {
    const parts: string[] = [];
    parts.push(formatShortDateTime(startDate));
    const timeUntil = formatTimeUntil(startDate);
    if (timeUntil) {
        parts.push(`Starts ${timeUntil}`);
    }
    if (event.location) {
        parts.push(`Location: ${event.location}`);
    }
    return parts.join(' · ');
};

const buildTaskNotificationBody = (task: Task, dueDate: Date): string => {
    const parts: string[] = [];
    parts.push(formatShortDateTime(dueDate));
    if (task.dueDisplay) {
        parts.push(`Due ${task.dueDisplay}`);
    }
    const timeUntil = formatTimeUntil(dueDate);
    if (timeUntil) {
        parts.push(`Due ${timeUntil}`);
    }
    if (task.priority) {
        parts.push(`Priority: ${task.priority}`);
    }
    return parts.join(' · ');
};

const DEFAULT_WEEKDAY_SCHEDULE = [1, 2, 3, 4, 5];
const MANUAL_REPEAT_TYPES: RepeatType[] = ['biweekly', 'weekday', 'monthly', 'yearly', 'custom'];
// Note: 'hourly' is NOT in MANUAL_REPEAT_TYPES because it's handled by RepeatFrequency.HOURLY in Notifee

const getNextWeekday = (date: Date, allowed: number[]) => {
    const next = new Date(date);
    for (let i = 1; i <= 7; i++) {
        next.setDate(date.getDate() + i);
        if (allowed.includes(next.getDay())) {
            return next;
        }
    }
    return null;
};

const getNextCustomDate = (dates: string[] | undefined) => {
    if (!dates || dates.length === 0) return null;
    const now = Date.now();
    const sorted = dates
        .map(d => new Date(d))
        .filter(d => !Number.isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());
    return sorted.find(d => d.getTime() > now) || null;
};

const computeNextDate = (
    current: Date,
    repeatType: RepeatType,
    meta?: RepeatMeta
): Date | null => {
    const next = new Date(current);

    switch (repeatType) {
        case 'hourly':
            next.setHours(next.getHours() + 1);
            return next;
        case 'biweekly':
            next.setDate(next.getDate() + 14);
            return next;
        case 'monthly': {
            const day = current.getDate();
            next.setMonth(next.getMonth() + (meta?.interval ?? 1));
            if (next.getDate() !== day) {
                next.setDate(0);
            }
            return next;
        }
        case 'yearly':
            next.setFullYear(next.getFullYear() + (meta?.interval ?? 1));
            return next;
        case 'weekday':
            return getNextWeekday(current, meta?.daysOfWeek ?? DEFAULT_WEEKDAY_SCHEDULE);
        default:
            return null;
    }
};

const isManualRepeatType = (repeatType: RepeatType) => MANUAL_REPEAT_TYPES.includes(repeatType);

const findNextManualEventDate = (
    base: Date,
    repeatType: RepeatType,
    meta?: RepeatMeta,
    reminderMinutes = 0
): Date | null => {
    const now = new Date();
    const reminderOffset = reminderMinutes * 60000;
    const limit = 240;
    let candidate = new Date(base);

    if (repeatType === 'custom') {
        const sortedDates = (meta?.dates ?? [])
            .map(d => new Date(d))
            .filter(d => !Number.isNaN(d.getTime()))
            .sort((a, b) => a.getTime() - b.getTime());

        for (const customDate of sortedDates) {
            const reminderTrigger = new Date(customDate.getTime() - reminderOffset);
            if (reminderTrigger > now) {
                return customDate;
            }
        }

        return null;
    }

    let attempts = 0;
    while (attempts < limit) {
        if (candidate > now) {
            const reminderTrigger = new Date(candidate.getTime() - reminderOffset);
            if (reminderTrigger > now) {
                return candidate;
            }
        }

        const next = computeNextDate(candidate, repeatType, meta);
        if (!next) {
            return null;
        }
        candidate = next;
        attempts += 1;
    }

    console.warn('Manual repeat lookup exhausted without finding a future occurrence');
    return null;
};

const repeatFrequencyForType = (repeatType: RepeatType): RepeatFrequency | undefined => {
    switch (repeatType) {
        case 'hourly':
            return RepeatFrequency.HOURLY;
        case 'daily':
            return RepeatFrequency.DAILY;
        case 'weekly':
            return RepeatFrequency.WEEKLY;
        default:
            return undefined;
    }
};

const buildRepeatMetaFromRule = (rule?: string): RepeatMeta | undefined => {
    switch (normalizeRepeatType(rule)) {
        case 'biweekly':
            return { interval: 2 };
        case 'monthly':
            return { interval: 1 };
        case 'yearly':
            return { interval: 1 };
        case 'weekday':
            return { daysOfWeek: DEFAULT_WEEKDAY_SCHEDULE };
        default:
            return undefined;
    }
};

interface DocumentReminderCandidate {
    field: string;
    label: string;
    date: Date;
}

interface DocumentReminderDefinition {
    field: string;
    label: string;
    shouldInclude?: (doc: Document) => boolean;
}

const getDocumentMetaValue = (doc: Document, key: string): string | undefined => {
    const metaValue = doc.meta?.[key];
    if (metaValue) return metaValue;
    return (doc as any)[key];
};

const DOCUMENT_REMINDER_DEFINITIONS: DocumentReminderDefinition[] = [
    {
        field: 'warrantyTillDate',
        label: 'Warranty',
        shouldInclude: (doc) => Boolean(getDocumentMetaValue(doc, 'warrantyTillDate')),
    },
    {
        field: 'nextServiceDate',
        label: 'Service',
        shouldInclude: (doc) => Boolean(getDocumentMetaValue(doc, 'nextServiceDate')),
    },
    {
        field: 'billDate',
        label: 'Bill',
        shouldInclude: (doc) => Boolean(getDocumentMetaValue(doc, 'billDate')),
    },
    {
        field: 'expiryDate',
        label: 'Expiry',
        shouldInclude: (doc) => Boolean(getDocumentMetaValue(doc, 'expiryDate') || doc.expiryDate),
    },
];

const formatDocumentDate = (date: Date): string => {
    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

const buildDocumentReminderBody = (doc: Document, field: string, dateLabel: string): string => {
    switch (field) {
        case 'warrantyTillDate':
            return `Warranty for ${doc.name} expires on ${dateLabel}.`;
        case 'nextServiceDate':
            return `Service for ${doc.name} is scheduled on ${dateLabel}.`;
        case 'billDate':
            return `Bill for ${doc.name} is due on ${dateLabel}.`;
        case 'expiryDate':
        default:
            return `${doc.name} expires on ${dateLabel}.`;
    }
};

const buildDocumentReminderCandidates = (doc: Document): DocumentReminderCandidate[] => {
    const candidates: DocumentReminderCandidate[] = [];
    DOCUMENT_REMINDER_DEFINITIONS.forEach((definition) => {
        if (definition.shouldInclude && !definition.shouldInclude(doc)) return;
        const rawValue = getDocumentMetaValue(doc, definition.field);
        if (!rawValue) return;
        const parsed = new Date(rawValue);
        if (Number.isNaN(parsed.getTime())) return;
        candidates.push({
            field: definition.field,
            label: definition.label,
            date: parsed,
        });
    });
    return candidates;
};

interface DocumentReminderRule {
    field: string;
    offsets: number[];
    timeOfDay?: string;
}

const DEFAULT_REMINDER_OFFSETS = [1];
const DEFAULT_REMINDER_TIME = '09:00';

const sanitizeOffsets = (values: any): number[] => {
    if (!Array.isArray(values)) return [];
    return Array.from(new Set(values.map((value: any) => Number(value)).filter(offset => Number.isFinite(offset) && offset > 0))).sort((a, b) => a - b);
};

const sanitizeReminderRules = (raw: any): DocumentReminderRule[] => {
    if (!raw) return [];
    if (!Array.isArray(raw)) return [];
    return raw.map(item => ({
        field: item?.field,
        offsets: sanitizeOffsets(item?.offsets),
        timeOfDay: typeof item?.timeOfDay === 'string' ? item.timeOfDay : undefined,
    }))
        .filter(rule => rule.field && rule.offsets.length > 0);
};

const getDocumentReminderRules = (doc: Document, field: string): DocumentReminderRule[] => {
    const metaRaw = doc.meta?.reminderRules;
    const hasMeta = Array.isArray(metaRaw);
    const metaRules = sanitizeReminderRules(metaRaw);
    if (hasMeta) {
        if (Array.isArray(metaRaw) && metaRaw.length === 0) {
            return [];
        }
        const fieldSpecific = metaRules.filter(rule => rule.field === field);
        if (fieldSpecific.length > 0) return fieldSpecific;
        return [];
    }

    if (Number.isFinite(doc.reminderDaysBefore)) {
        return [{
            field,
            offsets: [doc.reminderDaysBefore!],
            timeOfDay: DEFAULT_REMINDER_TIME,
        }];
    }
    return [{
        field,
        offsets: DEFAULT_REMINDER_OFFSETS,
        timeOfDay: DEFAULT_REMINDER_TIME,
    }];
};

const parseTimeOfDay = (value?: string): { hours: number; minutes: number } | null => {
    if (!value) return null;
    const match = value.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    let hours = Number(match[1]);
    let minutes = Number(match[2]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    hours = Math.min(Math.max(hours, 0), 23);
    minutes = Math.min(Math.max(minutes, 0), 59);
    return { hours, minutes };
};

const buildReminderTrigger = (baseDate: Date, offsetDays: number, timeOfDay?: string): Date => {
    const trigger = new Date(baseDate);
    trigger.setDate(trigger.getDate() - offsetDays);
    const parsedTime = parseTimeOfDay(timeOfDay);
    if (parsedTime) {
        trigger.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
    } else {
        trigger.setHours(9, 0, 0, 0);
    }
    return trigger;
};

const persistDocumentNotificationIds = async (documentId: string, ids: string[] | null): Promise<void> => {
    try {
        await getDatabase().write(async () => {
            const doc = await getDatabase().get<Document>('documents').find(documentId);
            await doc.update(d => {
                d.notificationIdsJson = ids && ids.length ? JSON.stringify(ids) : undefined;
            });
        });
    } catch (error) {
        console.error('Failed to persist document notification IDs:', error);
    }
};

const normalizeRepeatType = (rule?: string | RepeatType): RepeatType => {
    if (!rule) return 'none';
    if (typeof rule !== 'string') {
        return rule;
    }
    switch (rule.toLowerCase()) {
        case 'hourly':
            return 'hourly';
        case 'daily':
            return 'daily';
        case 'weekly':
            return 'weekly';
        case 'biweekly':
            return 'biweekly';
        case 'monthly':
            return 'monthly';
        case 'yearly':
            return 'yearly';
        case 'weekday':
            return 'weekday';
        case 'custom':
            return 'custom';
        default:
            return 'none';
    }
};

let alarmPermissionChecked = false;
let alarmPermissionGranted = false;

/**
 * Get the currently active member ID from the database
 */
export const getActiveMemberId = async (): Promise<string | null> => {
    try {
        const profileId = await ProfileService.getActiveProfileId();
        if (!profileId) {
            console.warn('NotificationScheduler: Cannot resolve active member without profile id');
            return null;
        }
        const members = await getDatabase().get<Member>('members').query(
            Q.where('profile_id', profileId),
            Q.where('is_active', true)
        ).fetch();
        return members.length > 0 ? members[0].id : null;
    } catch (error) {
        console.error('Failed to get active member:', error);
        return null;
    }
};
let alarmSettingsNotificationSent = false;

const ensureAlarmPermission = async (promptToOpenSettings = false): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    if (alarmPermissionChecked && alarmPermissionGranted) return true;

    try {
        const settings = await notifee.getNotificationSettings();
        const androidSettings = settings.android;
        const alarmSetting = androidSettings?.alarm;
        const enabled = alarmSetting === AndroidNotificationSetting.ENABLED;
        alarmPermissionChecked = true;
        alarmPermissionGranted = enabled;

        if (!enabled && promptToOpenSettings === true) {
            if (!alarmSettingsNotificationSent) {
                alarmSettingsNotificationSent = true;
            const profileId = await ProfileService.getActiveProfileId();
            NotificationCenter.addNotification({
                title: "Enable exact alarms",
                detail: "Allow Exact Alarms (Android S/14+) so reminders fire on time.",
                tone: 'rgba(245,158,11,0.2)',
                textColor: '#F59E0B',
                icon: 'alertCircle',
            }, profileId);
            }
            await notifee.openAlarmPermissionSettings();
        }

        return enabled;
    } catch (error) {
        console.warn("Failed to query alarm permission:", error);
        return alarmPermissionGranted;
    }
};

type NotificationJob = () => Promise<void>;
const notificationJobQueue: NotificationJob[] = [];
let notificationJobRunning = false;

const processNotificationJobQueue = async (): Promise<void> => {
    if (notificationJobRunning) {
        return;
    }
    notificationJobRunning = true;
    while (notificationJobQueue.length > 0) {
        const job = notificationJobQueue.shift()!;
        try {
            await job();
        } catch (error) {
            console.error('Notification job failed:', error);
        }
    }
    notificationJobRunning = false;
};

export const MIN_FUTURE_BUFFER_MS = 60_000; // always leave a minute buffer
const STALE_THRESHOLD_MS = 5 * 60_000; // more than 5 minutes old is considered stale
const DUPLICATE_WINDOW_MS = 1_000; // treat timestamps within 1s as duplicates

export const getSafeFutureTimestamp = (
    input: Date | number | string | undefined | null,
    options?: { bufferMs?: number; staleThresholdMs?: number }
): number | null => {
    const bufferMs = options?.bufferMs ?? MIN_FUTURE_BUFFER_MS;
    const staleThresholdMs = options?.staleThresholdMs ?? STALE_THRESHOLD_MS;
    if (input === null || input === undefined) {
        return null;
    }

    let timestamp: number;
    if (typeof input === 'number') {
        timestamp = input;
    } else if (typeof input === 'string') {
        timestamp = Date.parse(input);
    } else if (input instanceof Date) {
        timestamp = input.getTime();
    } else {
        return null;
    }

    if (!Number.isFinite(timestamp) || Number.isNaN(timestamp)) {
        return null;
    }

    const now = Date.now();
    if (timestamp < now - staleThresholdMs) {
        return null;
    }

    if (timestamp < now) {
        return now + bufferMs;
    }

    if (timestamp < now + bufferMs) {
        return now + bufferMs;
    }

    return timestamp;
};

const buildNotificationKey = (category: NotificationCategory, data: NotificationData): string => {
    const idFields = ['eventId', 'taskId', 'documentId', 'mealPlanId', 'budgetId'];
    for (const field of idFields) {
        const value = data.data?.[field];
        if (value) {
            return `${category}:${field}:${value}`;
        }
    }
    const payloadSignature = JSON.stringify({ title: data.title, body: data.body, data: data.data ?? {} });
    return `${category}:generic:${payloadSignature}`;
};

const notificationMetaByKey = new Map<string, { notificationId: string; timestamp: number }>();
const notificationKeyById = new Map<string, string>();

export const resetNotificationSchedulerState = (): void => {
    notificationMetaByKey.clear();
    notificationKeyById.clear();
};

export const NotificationScheduler = {
    /**
     * Initialize notification channels (Android)
     */
    async initialize() {
        try {
            await ensureSoundChannelsCreated();

            await ensureAlarmPermission(false);

            console.log('✓ Notification channels initialized');
        } catch (error) {
            console.error('Failed to initialize notifications:', error);
        }
    },

    enqueueJob(job: NotificationJob) {
        notificationJobQueue.push(job);
        void processNotificationJobQueue();
    },

    /**
     * Update channel selection after user toggles sound. Channels are immutable,
     * so we just ensure they exist and rely on runtime channel selection instead.
     */
    async updateChannelSoundPreference(soundEnabled: boolean): Promise<void> {
        try {
            await ensureSoundChannelsCreated();
            console.log(`Notification sound preference updated; future notifications will use ${soundEnabled ? 'chat_sound_on' : 'chat_sound_off'}`);
        } catch (error) {
            console.error('Failed to update channel sound preference:', error);
        }
    },

    /**
     * Check if a notification category is enabled in user preferences
     */
    async isCategoryEnabled(category: NotificationCategory): Promise<boolean> {
        try {
            const prefsCollection = getDatabase().get('notification_preferences');
            const prefs = await prefsCollection.query(
                Q.where('category', category)
            ).fetch();

            if (prefs.length === 0) {
                // Default to enabled if no preference set
                return true;
            }

            return (prefs[0] as any).enabled;
        } catch (error) {
            console.error('Error checking category preference:', error);
            return true; // Default to enabled on error
        }
    },

    /**
     * Get quiet hours settings
     */
    async getQuietHours(): Promise<QuietHours | null> {
        try {
            const quietHoursCollection = getDatabase().get('quiet_hours');
            const settings = await quietHoursCollection.query().fetch();

            if (settings.length === 0) {
                return null;
            }

            const qh = settings[0] as any;
            return {
                enabled: qh.enabled,
                startHour: qh.startHour,
                startMinute: qh.startMinute,
                endHour: qh.endHour,
                endMinute: qh.endMinute,
            };
        } catch (error) {
            console.error('Error getting quiet hours:', error);
            return null;
        }
    },

    /**
     * Check if a time falls within quiet hours
     */
    isInQuietHours(date: Date, quietHours: QuietHours): boolean {
        if (!quietHours.enabled) return false;

        const hour = date.getHours();
        const minute = date.getMinutes();
        const timeInMinutes = hour * 60 + minute;

        const startInMinutes = quietHours.startHour * 60 + quietHours.startMinute;
        const endInMinutes = quietHours.endHour * 60 + quietHours.endMinute;

        // Handle overnight quiet hours (e.g., 22:00 - 07:00)
        if (startInMinutes > endInMinutes) {
            return timeInMinutes >= startInMinutes || timeInMinutes < endInMinutes;
        }

        return timeInMinutes >= startInMinutes && timeInMinutes < endInMinutes;
    },

    /**
     * Adjust trigger date if it falls in quiet hours
     * Delays notification until quiet hours end
     */
    async adjustForQuietHours(triggerDate: Date): Promise<Date> {
        const quietHours = await this.getQuietHours();
        if (!quietHours || !quietHours.enabled) {
            return triggerDate;
        }

        if (this.isInQuietHours(triggerDate, quietHours)) {
            // Delay until quiet hours end
            const adjusted = new Date(triggerDate);
            adjusted.setHours(quietHours.endHour);
            adjusted.setMinutes(quietHours.endMinute);
            adjusted.setSeconds(0);
            adjusted.setMilliseconds(0);

            // If end time is before trigger time (overnight), add a day
            if (adjusted < triggerDate) {
                adjusted.setDate(adjusted.getDate() + 1);
            }

            console.log(`Notification delayed from ${triggerDate.toISOString()} to ${adjusted.toISOString()} due to quiet hours`);
            return adjusted;
        }

        return triggerDate;
    },

    /**
     * Schedule a notification
     * Returns the notificationId for storage in database
     */
    async scheduleNotification(
        category: NotificationCategory,
        data: NotificationData,
        triggerDate: Date,
        options: {
            repeatType?: RepeatType | string;
            repeatMeta?: RepeatMeta;
            notifyCenter?: boolean;
            promptForPermission?: boolean;
            promptForAlarm?: boolean;
        } = {}
    ): Promise<string | null> {
        // Validation: Events and Tasks must have IDs for deduplication to work
        if ((category === 'events' && !data.data?.eventId)) {
            throw new Error("Event notifications must include eventId");
        }
        if ((category === 'tasks' && !data.data?.taskId)) {
            throw new Error("Task notifications must include taskId");
        }

        try {
            const hasPermission = await checkPermission('notification');
            if (!hasPermission) {
                if (options?.promptForPermission) {
                    const granted = await requestPermission('notification');
                    if (!granted) {
                        console.warn(`Skipping scheduling for ${category} because the user denied notification permission`);
                        return null;
                    }
                } else {
                    console.warn(`Skipping scheduling for ${category} because notification permission is not granted`);
                    return null;
                }
            }

            const pushEnabled = await NotificationPreferencesService.isPushEnabled();
            if (!pushEnabled) {
                console.log('Global push notifications disabled; skipping scheduling.');
                return null;
            }

            // Check if category is enabled
            const enabled = await this.isCategoryEnabled(category);
            if (!enabled) {
                console.log(`Notification not scheduled: ${category} category disabled`);
                return null;
            }

            const promptForAlarm = options?.promptForAlarm === true;
            if (Platform.OS === 'android') {
                const hasAlarm = await ensureAlarmPermission(promptForAlarm);
                if (!hasAlarm) {
                    console.warn('Exact alarm permission is not granted; scheduled reminders may not fire reliably.');
                }
            }

            // Don't schedule past notifications unless it's repeating (Notifee helps here, but we should be careful)
            const repeatType = normalizeRepeatType(options?.repeatType);
            const repeatMeta = options?.repeatMeta;
            const notifyCenter = options?.notifyCenter ?? false;
            const soundEnabled = await NotificationPreferencesService.isSoundEnabled();
            await ensureSoundChannelsCreated();
            const channelId = getChannelIdBySoundPreference(soundEnabled);
            const iosSound = soundEnabled ? 'reminder.caf' : undefined;

            let candidateDate = new Date(triggerDate);
            if (repeatType === 'custom' && repeatMeta?.dates) {
                const nextCustom = getNextCustomDate(repeatMeta.dates);
                if (nextCustom) {
                    candidateDate = nextCustom;
                } else {
                    console.log('Custom repeat has no upcoming dates; not scheduling notification.');
                    return null;
                }
            }

            const quietAdjustedDate = await this.adjustForQuietHours(candidateDate);
            let finalTrigger = quietAdjustedDate;

            if (repeatType === 'hourly' && finalTrigger <= new Date()) {
                const now = new Date();
                const originalMinutes = candidateDate.getMinutes();
                const originalSeconds = candidateDate.getSeconds();
                const originalMilliseconds = candidateDate.getMilliseconds();
                
                finalTrigger = new Date(candidateDate);
                
                while (finalTrigger <= now) {
                    finalTrigger.setHours(finalTrigger.getHours() + 1);
                }
                
                finalTrigger.setMinutes(originalMinutes);
                finalTrigger.setSeconds(originalSeconds);
                finalTrigger.setMilliseconds(originalMilliseconds);
                
                finalTrigger = await this.adjustForQuietHours(finalTrigger);
                
                if (finalTrigger <= now) {
                    finalTrigger.setHours(finalTrigger.getHours() + 1);
                    finalTrigger = await this.adjustForQuietHours(finalTrigger);
                }
            }
            
            if (repeatType === 'weekday') {
                const allowedDays = repeatMeta?.daysOfWeek ?? DEFAULT_WEEKDAY_SCHEDULE;
                if (!allowedDays.includes(finalTrigger.getDay())) {
                    const nextWeekday = getNextWeekday(finalTrigger, allowedDays);
                    if (nextWeekday) {
                        finalTrigger = await this.adjustForQuietHours(nextWeekday);
                    }
                }
            }

            const notificationKey = buildNotificationKey(category, data);
            const rawTimestamp = finalTrigger.getTime();
            const safeTimestamp = getSafeFutureTimestamp(finalTrigger, {
                bufferMs: MIN_FUTURE_BUFFER_MS,
                staleThresholdMs: STALE_THRESHOLD_MS,
            });
            if (!safeTimestamp) {
                console.warn(`[Scheduler] Skipping ${category} notification for ${notificationKey} because trigger ${finalTrigger.toISOString()} is stale or invalid.`);
                return null;
            }

            if (safeTimestamp !== rawTimestamp) {
                console.warn(`[Scheduler] Adjusting ${category} trigger for ${notificationKey} from ${new Date(rawTimestamp).toISOString()} to ${new Date(safeTimestamp).toISOString()} to keep it in the future.`);
            }

            finalTrigger = new Date(safeTimestamp);
            const existingMeta = notificationMetaByKey.get(notificationKey);
            if (existingMeta && Math.abs(existingMeta.timestamp - safeTimestamp) < DUPLICATE_WINDOW_MS) {
                console.log(`[Scheduler] Reusing existing ${category} notification ${existingMeta.notificationId} for ${notificationKey} (timestamp unchanged).`);
                return existingMeta.notificationId;
            }
            
            const repeatFrequency = repeatFrequencyForType(repeatType);

            // Create trigger
            const trigger: TimestampTrigger = {
                type: TriggerType.TIMESTAMP,
                timestamp: safeTimestamp,
                repeatFrequency,
                alarmManager: {
                    allowWhileIdle: true,
                },
            };

            // Schedule notification
            const notificationId = await notifee.createTriggerNotification(
                {
                    title: data.title,
                    body: data.body,
                    data: {
                        ...(data.data ?? {}),
                        __repeatType: repeatType,
                        ...(repeatMeta ? { __repeatMeta: repeatMeta } : {}),
                        __lastTrigger: finalTrigger.toISOString(),
                        __category: category,
                    },
                    android: {
                        channelId,
                        pressAction: {
                            id: 'default',
                        },
                        smallIcon: 'ic_launcher',
                    },
                    ios: {
                        ...(iosSound ? { sound: iosSound } : {}),
                    },
                },
                trigger
            );

            if (notificationId) {
                notificationMetaByKey.set(notificationKey, { notificationId, timestamp: safeTimestamp });
                notificationKeyById.set(notificationId, notificationKey);
            }

            console.log(`✓ Scheduled ${category} notification: ${notificationId} for ${finalTrigger.toISOString()} ${repeatType !== 'none' ? `(Repeat: ${repeatType})` : ''}`);

            if (notifyCenter) {
                const profileId = await ProfileService.getActiveProfileId();
                const meta = CATEGORY_META[category];
                const bodyLabel = (data.body ?? data.title).trim();
                const repeatSuffix = describeRepeat(repeatType).trim();
                const centerDetail = repeatSuffix ? `${bodyLabel} ${repeatSuffix}` : bodyLabel;
                NotificationCenter.addNotification({
                    title: data.title,
                    detail: centerDetail,
                    tone: meta.tone,
                    textColor: meta.textColor,
                    icon: meta.icon,
                    route: ROUTE_FOR_CATEGORY[category],
                }, profileId);
            }
            return notificationId;
        } catch (error) {
            console.error(`Failed to schedule ${category} notification:`, error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
                console.error('Stack:', error.stack);
            }
            return null;
        }
    },

    /**
     * Fire an immediate notification (e.g., after user edits a reminder).
     */
    async notifyImmediateUpdate(
        category: NotificationCategory,
        title: string,
        body: string,
        data?: Record<string, any>
    ): Promise<void> {
        try {
            const hasPermission = await checkPermission('notification');
            if (!hasPermission) {
                console.warn(`Skipping immediate ${category} notification because notifications are disabled`);
                return;
            }

            const soundEnabled = await NotificationPreferencesService.isSoundEnabled();
            await ensureSoundChannelsCreated();
            const channelId = getChannelIdBySoundPreference(soundEnabled);

            await notifee.displayNotification({
                title,
                body,
                data,
                android: {
                    channelId,
                    pressAction: {
                        id: 'default',
                    },
                    smallIcon: 'ic_launcher',
                },
                ios: {
                    sound: 'default',
                },
            });
        } catch (error) {
            console.error(`Failed to display update notification for ${category}:`, error);
        }
    },

    async ensureExactAlarm(promptToOpenSettings = false): Promise<boolean> {
        return ensureAlarmPermission(promptToOpenSettings);
    },

    isExactAlarmEnabled(): boolean {
        return alarmPermissionGranted;
    },

    /**
     * Cancel a notification
     */
    async cancelNotification(id: string): Promise<void> {
        if (!id) return;

        const mappedKey = notificationKeyById.get(id);
        if (mappedKey) {
            notificationKeyById.delete(id);
            notificationMetaByKey.delete(mappedKey);
        }

        try {
            await notifee.cancelTriggerNotification(id);
        } catch (error) {
            // Ignore error if trigger doesn't exist
        }

        try {
            await notifee.cancelDisplayedNotification(id);
        } catch (error) {
            // Ignore error if notification not displayed
        }

        console.log(`✓ Cancelled notification (trigger/display): ${id}`);
    },

    /**
     * Cancel multiple notifications (for documents with multiple reminders)
     */
    async cancelNotifications(notificationIds: string[]): Promise<void> {
        try {
            if (!notificationIds || notificationIds.length === 0) return;

            await Promise.all(
                notificationIds.map(id => this.cancelNotification(id))
            );
        } catch (error) {
            console.error('Failed to cancel notifications:', error);
        }
    },

    /**
     * Update a notification (cancel old, schedule new)
     */
    async updateNotification(
        oldNotificationId: string | null,
        category: NotificationCategory,
        data: NotificationData,
        triggerDate: Date,
        options?: {
            repeatType?: RepeatType | string;
            repeatMeta?: RepeatMeta;
            notifyCenter?: boolean;
            promptForPermission?: boolean;
            promptForAlarm?: boolean;
        }
    ): Promise<string | null> {
        try {
            // Cancel old notification
            if (oldNotificationId) {
                await this.cancelNotification(oldNotificationId);
            }

            // Schedule new notification
            return await this.scheduleNotification(category, data, triggerDate, options);
        } catch (error) {
            console.error('Failed to update notification:', error);
            return null;
        }
    },

    /**
     * Cancel all notifications for a category
     * Used when user disables a category in preferences
     */
    async cancelAllForCategory(category: NotificationCategory): Promise<void> {
        try {
            console.log(`Cancelling all notifications for category: ${category}`);

            // Get all items with notifications for this category
            let collection;

            switch (category) {
                case 'events':
                    collection = getDatabase().get('events');
                    break;
                case 'tasks':
                    collection = getDatabase().get('tasks');
                    break;
                case 'documents':
                    collection = getDatabase().get('documents');
                    break;
                case 'meals':
                    collection = getDatabase().get('meal_plans');
                    break;
                case 'budgets':
                    collection = getDatabase().get('budgets');
                    break;
            }

            if (!collection) return;

            const items = await collection.query().fetch();

            for (const item of items) {
                const itemAny = item as any;
                if (category === 'documents' && itemAny.notificationIdsJson) {
                    // Documents have multiple notification IDs
                    const ids = JSON.parse(itemAny.notificationIdsJson);
                    await this.cancelNotifications(ids);
                    await item.update((i: any) => {
                        i.notificationIdsJson = null;
                    });
                } else if (itemAny.notificationId) {
                    await this.cancelNotification(itemAny.notificationId);
                    await item.update((i: any) => {
                        i.notificationId = null;
                    });
                }
            }

            console.log(`✓ Cancelled all ${category} notifications`);
        } catch (error) {
            console.error(`Failed to cancel all notifications for ${category}:`, error);
        }
    },

    /**
     * Cancel notifications tied to a document
     */
    async cancelDocumentNotifications(document: Document): Promise<void> {
        try {
            if (!document.notificationIdsJson) return;
            let ids: string[] = [];
            try {
                ids = JSON.parse(document.notificationIdsJson);
            } catch (error) {
                console.error('Failed to parse document notification IDs JSON:', error);
                ids = [];
            }
            if (ids.length === 0) {
                await persistDocumentNotificationIds(document.id, null);
                return;
            }
            await this.cancelNotifications(ids);
            await persistDocumentNotificationIds(document.id, null);
        } catch (error) {
            console.error('Failed to cancel document notifications:', error);
        }
    },

    /**
     * Ensure all reminders for a document are aligned with its metadata
     */
    async syncDocumentReminders(document: Document, options?: { checkExisting?: boolean; activeNotificationIds?: Set<string>; notifyCenter?: boolean; promptForPermission?: boolean }): Promise<void> {
        if (!document) return;
        try {
            // Optimization: If doing a safety check, skip if notifications already exist
            if (options?.checkExisting && options?.activeNotificationIds && document.notificationIdsJson) {
                try {
                    const ids = JSON.parse(document.notificationIdsJson);
                    if (Array.isArray(ids) && ids.length > 0) {
                        const allExist = ids.every(id => options.activeNotificationIds!.has(id));
                        if (allExist) {
                            // console.log(`Skipping document ${document.id} - reminders already active`);
                            return;
                        }
                    }
                } catch (e) {
                    // Ignore parse error, proceed to sync
                }
            }

            await this.cancelDocumentNotifications(document);
            const candidates = buildDocumentReminderCandidates(document);
            if (candidates.length === 0) {
                await persistDocumentNotificationIds(document.id, null);
                return;
            }

            const now = new Date();
            const scheduledIds: string[] = [];

            for (const candidate of candidates) {
                const candidateRules = getDocumentReminderRules(document, candidate.field);
                const formattedDate = formatDocumentDate(candidate.date);
                const title = `${candidate.label} reminder`;
                const body = buildDocumentReminderBody(document, candidate.field, formattedDate);

                for (const rule of candidateRules) {
                    for (const offset of rule.offsets) {
                        const triggerDate = buildReminderTrigger(candidate.date, offset, rule.timeOfDay);
                        if (triggerDate <= now) continue;

                        const notificationId = await this.scheduleNotification(
                            'documents',
                            {
                                title,
                                body,
                                data: {
                                    documentId: document.id,
                                    reminderField: candidate.field,
                                },
                            },
                            triggerDate,
                        {
                            notifyCenter: options?.notifyCenter ?? false, // Configurable, default to false
                            promptForPermission: options?.promptForPermission ?? false,
                            promptForAlarm: false,
                        }
                    );

                        if (notificationId) scheduledIds.push(notificationId);
                    }
                }
            }

            await persistDocumentNotificationIds(document.id, scheduledIds.length ? scheduledIds : null);
        } catch (error) {
            console.error('Failed to sync document notifications:', error);
        }
    },

    /**
     * Reschedule all missing notifications
     * Called on app launch as a safety check
     */
    async rescheduleAllMissing(): Promise<void> {
        try {
            console.log('Running notification safety check...');

            const profileId = await ProfileService.getActiveProfileId();
            if (!profileId) {
                console.log('NotificationScheduler: Active profile unknown, skipping safety check');
                return;
            }

            // 1. Get ALL currently scheduled notifications from Notifee (Source of Truth)
            const existingTriggers = await notifee.getTriggerNotifications();
            console.log(`Found ${existingTriggers.length} active triggers`);

            const [defaultEventReminder, defaultTaskReminder] = await Promise.all([
                NotificationPreferencesService.getReminderTime('events'),
                NotificationPreferencesService.getReminderTime('tasks'),
            ]);

            // Fetch all Events and Tasks for comparison
            const events = await getDatabase().collections
                .get<Event>('events')
                .query(
                    Q.where('profile_id', profileId),
                    Q.where('deleted', false)
                )
                .fetch();
            const tasks = await getDatabase().collections
                .get<Task>('tasks')
                .query(
                    Q.where('profile_id', profileId),
                    Q.where('deleted', false)
                )
                .fetch();

            const eventIdMap = new Set(events.map(e => e.id));
            const taskIdMap = new Set(tasks.map(t => t.id));

            // === CLEANUP PASS: Remove Orphans and Duplicates ===
            const eventTriggerMap = new Map<string, string>();
            const taskTriggerMap = new Map<string, string>();

            for (const trigger of existingTriggers) {
                const data = trigger.notification.data;
                const id = trigger.notification.id;
                if (!id) continue;

                if (data?.eventId) {
                    const eventId = data.eventId as string;
                    // Orphan Check: Event no longer exists in DB
                    if (!eventIdMap.has(eventId)) {
                        await notifee.cancelTriggerNotification(id);
                        continue;
                    }
                    // Duplicate Check: Already saw a trigger for this event
                    if (eventTriggerMap.has(eventId)) {
                        await notifee.cancelTriggerNotification(id);
                        continue;
                    }
                    eventTriggerMap.set(eventId, id);
                }
                else if (data?.taskId) {
                    const taskId = data.taskId as string;
                    if (!taskIdMap.has(taskId)) {
                        await notifee.cancelTriggerNotification(id);
                        continue;
                    }
                    if (taskTriggerMap.has(taskId)) {
                        await notifee.cancelTriggerNotification(id);
                        continue;
                    }
                    taskTriggerMap.set(taskId, id);
                }
            }

            // Get active member ID - only schedule notifications for active profile
            const activeMemberId = await getActiveMemberId();
            if (!activeMemberId) {
                console.log('No active member found, skipping notification scheduling');
                return;
            }

            // === SCHEDULE PASS: Events ===
            for (const event of events) {
                // Filter: Only schedule notifications for events assigned to active member
                if (event.memberId !== activeMemberId) {
                    // Cancel notification if it exists but event is not for active member
                    if (event.notificationId) {
                        await notifee.cancelTriggerNotification(event.notificationId);
                        await getDatabase().write(async () => {
                            await event.update(e => { e.notificationId = null as any; });
                        });
                    }
                    continue;
                }

                if (event.reminderOffsetMinutes !== undefined && event.reminderOffsetMinutes < 0) continue;

                // Check if already scheduled (from our clean map)
                if (eventTriggerMap.has(event.id)) {
                    const correctId = eventTriggerMap.get(event.id)!;

                    // Self-healing: Update DB if ID mismatch
                    if (event.notificationId !== correctId) {
                        console.log(`[Scheduler] Healing Event ${event.id}: DB ID ${event.notificationId} -> Notifee ID ${correctId}`);
                        await getDatabase().write(async () => {
                            await event.update(e => { e.notificationId = correctId; });
                        });
                    }
                    continue;
                }

                // If DB has an ID but it's not in Notifee (and not in our map check above), it's stale.
                // We clear it to be clean, though scheduleNotification would overwrite it usually.
                if (event.notificationId) {
                    await getDatabase().write(async () => {
                        await event.update(e => { e.notificationId = null as any; });
                    });
                }

                // Original Logic for Date & Recurrence
                const eventDate = parseReminderDateTime(event.dateString, event.time);
                if (!eventDate) continue;

                const repeatRule = event.isRecurring ? event.recurrenceRule : undefined;
                const repeatType = event.isRecurring ? normalizeRepeatType(repeatRule) : 'none';
                const repeatMeta = event.isRecurring ? buildRepeatMetaFromRule(repeatRule) : undefined;
                const reminderMinutes = event.reminderOffsetMinutes ?? defaultEventReminder;
                const manualRepeat = isManualRepeatType(repeatType);

                let targetEventDate = eventDate;
                
                // For hourly repeats, find the next occurrence if the event time is in the past
                if (repeatType === 'hourly' && eventDate <= new Date()) {
                    const now = new Date();
                    targetEventDate = new Date(eventDate);
                    // Keep incrementing by 1 hour until we find a future time
                    while (targetEventDate <= now) {
                        targetEventDate.setHours(targetEventDate.getHours() + 1);
                    }
                } else if (manualRepeat) {
                    const nextEventDate = findNextManualEventDate(eventDate, repeatType, repeatMeta, reminderMinutes);
                    if (!nextEventDate) continue;
                    targetEventDate = nextEventDate;
                }

                const triggerDate = new Date(targetEventDate.getTime() - reminderMinutes * 60000);
                if (!manualRepeat && triggerDate <= new Date() && !event.isRecurring) continue;
                if (manualRepeat && triggerDate <= new Date()) continue;

                const eventTitle = event.title?.trim() || 'Upcoming event';
                const eventBody = buildEventNotificationBody(event, targetEventDate);
                const notificationId = await this.scheduleNotification(
                    'events',
                    {
                        title: eventTitle,
                        body: eventBody || 'Reminder scheduled',
                        data: { eventId: event.id },
                    },
                    triggerDate,
                    {
                        repeatType,
                        repeatMeta,
                        notifyCenter: true, // Visible in Bell icon list
                        promptForAlarm: false // Background reschedules should not force settings
                    }
                );

                if (notificationId) {
                    await getDatabase().write(async () => {
                        await event.update(e => { e.notificationId = notificationId; });
                    });
                }
            }

            // === SCHEDULE PASS: Tasks ===
            for (const task of tasks) {
                // Filter: Only schedule notifications for tasks assigned to active member
                if (task.assigneeId !== activeMemberId) {
                    // Cancel notification if it exists but task is not for active member
                    if (task.notificationId) {
                        await notifee.cancelTriggerNotification(task.notificationId);
                        await getDatabase().write(async () => {
                            await task.update(t => { t.notificationId = null as any; });
                        });
                    }
                    continue;
                }

                if (task.status === 'done' || !task.reminderEnabled) continue;

                if (taskTriggerMap.has(task.id)) {
                    const correctId = taskTriggerMap.get(task.id)!;
                    if (task.notificationId !== correctId) {
                        await getDatabase().write(async () => {
                            await task.update(t => { t.notificationId = correctId; });
                        });
                    }
                    continue;
                }

                if (task.notificationId) {
                    await getDatabase().write(async () => {
                        await task.update(t => { t.notificationId = null as any; });
                    });
                }

                // Standard Scheduling Logic
                const taskDate = parseReminderDateTime(task.dateString, task.dueDisplay);
                if (!taskDate) continue;

                const triggerDate = new Date(taskDate.getTime() - defaultTaskReminder * 60000);
                if (triggerDate <= new Date()) continue;

                const taskTitle = task.name?.trim() || 'Task reminder';
                const taskBody = buildTaskNotificationBody(task, taskDate);
                const notificationId = await this.scheduleNotification(
                    'tasks',
                    {
                        title: taskTitle,
                        body: taskBody || `Priority: ${task.priority}`,
                        data: { taskId: task.id }
                    },
                    triggerDate,
                    {
                        notifyCenter: true, // Visible in Bell icon list
                        promptForAlarm: false // Background reschedules should not force settings
                    }
                );

                if (notificationId) {
                    await getDatabase().write(async () => {
                        await task.update(t => { t.notificationId = notificationId; });
                    });
                }
            }

            // 4. Reschedule Document Reminders
            const documents = await getDatabase().collections
                .get<Document>('documents')
                .query(
                    Q.where('profile_id', profileId),
                    Q.where('deleted', false)
                )
                .fetch();
            // Allow lookup of valid notification IDs (for self-healing DB check)
            // This set is needed for syncDocumentReminders's checkExisting optimization
            const activeNotificationIds = new Set(existingTriggers.map(t => t.notification.id).filter(Boolean) as string[]);

            for (const document of documents) {
                await this.syncDocumentReminders(document, {
                    checkExisting: true,
                    activeNotificationIds,
                    notifyCenter: true // Enable to populate Notification Center list on launch
                });
            }

            console.log('✓ Notification safety check complete');
        } catch (error) {
            console.error('Failed to reschedule missing notifications:', error);
        }
    },

    /**
     * Reschedule all notifications for the currently active profile
     * Called when user switches profiles to cancel old notifications and schedule new ones
     */
    async rescheduleNotificationsForActiveProfile(): Promise<void> {
        try {
            console.log('Rescheduling notifications for active profile...');
            const profileId = await ProfileService.getActiveProfileId();
            if (!profileId) {
                console.log('NotificationScheduler: No active profile, skipping reschedule');
                return;
            }

            // Cancel all existing trigger notifications
            const existingTriggers = await notifee.getTriggerNotifications();
            for (const trigger of existingTriggers) {
                const id = trigger.notification.id;
                if (id) {
                    await notifee.cancelTriggerNotification(id);
                }
            }

            resetNotificationSchedulerState();

            // Clear notification IDs from database
            const events = await getDatabase().collections
                .get<Event>('events')
                .query(
                    Q.where('profile_id', profileId),
                    Q.where('deleted', false)
                )
                .fetch();
            const tasks = await getDatabase().collections
                .get<Task>('tasks')
                .query(
                    Q.where('profile_id', profileId),
                    Q.where('deleted', false)
                )
                .fetch();

            await getDatabase().write(async () => {
                for (const event of events) {
                    if (event.notificationId) {
                        await event.update(e => { e.notificationId = null as any; });
                    }
                }
                for (const task of tasks) {
                    if (task.notificationId) {
                        await task.update(t => { t.notificationId = null as any; });
                    }
                }
            });

            // Reschedule all notifications (will filter by active member)
            await this.rescheduleAllMissing();
            
            console.log('✓ Notifications rescheduled for active profile');
        } catch (error) {
            console.error('Failed to reschedule notifications for active profile:', error);
        }
    },

    computeNextDate,
    getNextWeekday,
    getNextCustomDate,
    normalizeRepeatType,
    buildRepeatMetaFromRule,
};

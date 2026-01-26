import notifee, { AndroidImportance, AndroidNotificationSetting, TriggerType, TimestampTrigger, RepeatFrequency } from '@notifee/react-native';
import { Platform } from 'react-native';
import { database } from '../database';
import { Q } from '@nozbe/watermelondb';
import Event from '../database/models/Event';
import Task from '../database/models/Task';
import { NotificationPreferencesService } from './NotificationPreferencesService';
import { parseReminderDateTime } from '../utils/ReminderDateTimeUtils';
import { checkPermission, requestPermission } from '../utils/permissions';
import { NotificationCenter, NotificationRoute } from './NotificationCenter';
import { AppIconName } from '../components/ui/AppIcon';

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

// Notification Channels
const CHANNELS = {
    events: { id: 'events', name: 'Events', importance: AndroidImportance.HIGH },
    tasks: { id: 'tasks', name: 'Tasks', importance: AndroidImportance.DEFAULT },
    documents: { id: 'documents', name: 'Documents', importance: AndroidImportance.HIGH },
    meals: { id: 'meals', name: 'Meals', importance: AndroidImportance.DEFAULT },
    budgets: { id: 'budgets', name: 'Budgets', importance: AndroidImportance.HIGH },
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

const DEFAULT_WEEKDAY_SCHEDULE = [1, 2, 3, 4, 5];
const MANUAL_REPEAT_TYPES: RepeatType[] = ['biweekly', 'weekday', 'monthly', 'yearly', 'custom'];

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

const normalizeRepeatType = (rule?: string | RepeatType): RepeatType => {
    if (!rule) return 'none';
    if (typeof rule !== 'string') {
        return rule;
    }
    switch (rule.toLowerCase()) {
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
let alarmSettingsPrompted = false;
let lastChannelSoundSetting: boolean | null = null;

const deleteChannelSafe = async (channelId: string) => {
    try {
        await notifee.deleteChannel(channelId);
    } catch (error) {
        console.warn(`Failed to delete channel ${channelId}:`, error);
    }
};

const createChannelWithSound = async (channel: typeof CHANNELS[keyof typeof CHANNELS], soundEnabled: boolean) => {
    const soundValue = soundEnabled ? SOUND_NAME : undefined;
    await notifee.createChannel({
        id: channel.id,
        name: channel.name,
        importance: channel.importance,
        sound: soundValue,
    });
};

const recreateAllNotificationChannels = async (soundEnabled: boolean): Promise<void> => {
    for (const channel of Object.values(CHANNELS)) {
        await deleteChannelSafe(channel.id);
    }
    for (const channel of Object.values(CHANNELS)) {
        await createChannelWithSound(channel, soundEnabled);
    }
    lastChannelSoundSetting = soundEnabled;
};

const recreateChannelForCategory = async (category: NotificationCategory, soundEnabled: boolean): Promise<void> => {
    const channel = CHANNELS[category];
    if (!channel) return;
    await deleteChannelSafe(channel.id);
    await createChannelWithSound(channel, soundEnabled);
};

const ensureChannelsCreated = async (soundEnabled: boolean): Promise<void> => {
    if (lastChannelSoundSetting === soundEnabled) {
        return;
    }
    await recreateAllNotificationChannels(soundEnabled);
};

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

        if (!enabled && promptToOpenSettings && !alarmSettingsPrompted) {
            alarmSettingsPrompted = true;
            NotificationCenter.addNotification({
                title: "Enable exact alarms",
                detail: "Allow Exact Alarms (Android S/14+) so reminders fire on time.",
                tone: 'rgba(245,158,11,0.2)',
                textColor: '#F59E0B',
                icon: 'alertCircle',
            });
            await notifee.openAlarmPermissionSettings();
        }

        return enabled;
    } catch (error) {
        console.warn("Failed to query alarm permission:", error);
        return alarmPermissionGranted;
    }
};

export const NotificationScheduler = {
    /**
     * Initialize notification channels (Android)
     */
    async initialize() {
        try {

            const soundEnabled = await NotificationPreferencesService.isSoundEnabled();
            await ensureChannelsCreated(soundEnabled);

            await ensureAlarmPermission(false);

            console.log('✓ Notification channels initialized');
        } catch (error) {
            console.error('Failed to initialize notifications:', error);
        }
    },

    /**
     * Update all channels to respect the global sound toggle.
     */
    async updateChannelSoundPreference(soundEnabled: boolean): Promise<void> {
        try {
            await ensureChannelsCreated(soundEnabled);
            console.log(`Notification channels updated for ${soundEnabled ? 'sound' : 'silent'} delivery`);
        } catch (error) {
            console.error('Failed to update channel sound preference:', error);
        }
    },

    async recreateChannel(category: NotificationCategory, soundEnabled: boolean): Promise<void> {
        try {
            await recreateChannelForCategory(category, soundEnabled);
        } catch (error) {
            console.error(`Failed to recreate channel ${category}:`, error);
        }
    },

    async recreateAllChannels(soundEnabled: boolean): Promise<void> {
        try {
            await recreateAllNotificationChannels(soundEnabled);
        } catch (error) {
            console.error('Failed to recreate all notification channels:', error);
        }
    },

    /**
     * Check if a notification category is enabled in user preferences
     */
    async isCategoryEnabled(category: NotificationCategory): Promise<boolean> {
        try {
            const prefsCollection = database.get('notification_preferences');
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
            const quietHoursCollection = database.get('quiet_hours');
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
        options?: {
            repeatType?: RepeatType | string;
            repeatMeta?: RepeatMeta;
            notifyCenter?: boolean;
            promptForPermission?: boolean;
            promptForAlarm?: boolean;
        }
    ): Promise<string | null> {
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

            const promptForAlarm = options?.promptForAlarm ?? false;
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
            await ensureChannelsCreated(soundEnabled);
            const androidSound = soundEnabled ? SOUND_NAME : undefined;
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
            if (quietAdjustedDate <= new Date() && repeatType === 'none') {
                console.log(`Notification not scheduled: trigger date ${quietAdjustedDate.toISOString()} is in the past`);
                return null;
            }

            let finalTrigger = quietAdjustedDate;
            if (repeatType === 'weekday') {
                const allowedDays = repeatMeta?.daysOfWeek ?? DEFAULT_WEEKDAY_SCHEDULE;
                if (!allowedDays.includes(finalTrigger.getDay())) {
                    const nextWeekday = getNextWeekday(finalTrigger, allowedDays);
                    if (nextWeekday) {
                        finalTrigger = await this.adjustForQuietHours(nextWeekday);
                    }
                }
            }

            // Get channel for category
            const channel = CHANNELS[category];

            const repeatFrequency = repeatFrequencyForType(repeatType);

            // Create trigger
            const trigger: TimestampTrigger = {
                type: TriggerType.TIMESTAMP,
                timestamp: finalTrigger.getTime(),
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
                            channelId: channel.id,
                            pressAction: {
                                id: 'default',
                            },
                            smallIcon: 'ic_launcher',
                            sound: androidSound,
                        },
                        ios: {
                            ...(iosSound ? { sound: iosSound } : {}),
                        },
                    },
                trigger
            );

            console.log(`✓ Scheduled ${category} notification: ${notificationId} for ${finalTrigger.toISOString()} ${repeatType !== 'none' ? `(Repeat: ${repeatType})` : ''}`);

            if (notifyCenter) {
                const meta = CATEGORY_META[category];
                NotificationCenter.addNotification({
                    title: `${meta.label} reminder scheduled`,
                    detail: `${data.title} · ${finalTrigger.toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                    })}${describeRepeat(repeatType)}`,
                    tone: meta.tone,
                    textColor: meta.textColor,
                    icon: meta.icon,
                    route: ROUTE_FOR_CATEGORY[category],
                });
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

            const channel = CHANNELS[category];

            await notifee.displayNotification({
                title,
                body,
                data,
                android: {
                    channelId: channel.id,
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
    async cancelNotification(notificationId: string): Promise<void> {
        try {
            if (!notificationId) return;

            await notifee.cancelNotification(notificationId);
            console.log(`✓ Cancelled notification: ${notificationId}`);
        } catch (error) {
            console.error(`Failed to cancel notification ${notificationId}:`, error);
        }
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
                    collection = database.get('events');
                    break;
                case 'tasks':
                    collection = database.get('tasks');
                    break;
                case 'documents':
                    collection = database.get('documents');
                    break;
                case 'meals':
                    collection = database.get('meal_plans');
                    break;
                case 'budgets':
                    collection = database.get('budgets');
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
     * Reschedule all missing notifications
     * Called on app launch as a safety check
     */
    async rescheduleAllMissing(): Promise<void> {
        try {
            console.log('Running notification safety check...');

            const [defaultEventReminder, defaultTaskReminder] = await Promise.all([
                NotificationPreferencesService.getReminderTime('events'),
                NotificationPreferencesService.getReminderTime('tasks'),
            ]);

            const eventCollection = database.get<Event>('events');
            const events = await eventCollection.query().fetch();

            for (const event of events) {
                if (event.reminderOffsetMinutes !== undefined && event.reminderOffsetMinutes < 0) continue;

                const eventDate = parseReminderDateTime(event.dateString, event.time);
                if (!eventDate) continue;

                const repeatRule = event.isRecurring ? event.recurrenceRule : undefined;
                const repeatType = event.isRecurring ? normalizeRepeatType(repeatRule) : 'none';
                const repeatMeta = event.isRecurring ? buildRepeatMetaFromRule(repeatRule) : undefined;
                const reminderMinutes = event.reminderOffsetMinutes ?? defaultEventReminder;
                const manualRepeat = isManualRepeatType(repeatType);

                const shouldSkipBecauseScheduled = !!event.notificationId && !manualRepeat;
                if (shouldSkipBecauseScheduled) {
                    continue;
                }

                let targetEventDate = eventDate;
                if (manualRepeat) {
                    const nextEventDate = findNextManualEventDate(eventDate, repeatType, repeatMeta, reminderMinutes);
                    if (!nextEventDate) continue;
                    targetEventDate = nextEventDate;
                }

                const triggerDate = new Date(targetEventDate.getTime() - reminderMinutes * 60000);
                if (!manualRepeat && triggerDate <= new Date() && !event.isRecurring) continue;
                if (manualRepeat && triggerDate <= new Date()) continue;

                if (manualRepeat && event.notificationId) {
                    await this.cancelNotification(event.notificationId);
                }

                const notificationId = await this.scheduleNotification(
                    'events',
                    {
                        title: `Event: ${event.title}`,
                        body: event.location ? `at ${event.location}` : `Starting soon`,
                        data: { eventId: event.id },
                    },
                    triggerDate,
                    {
                        repeatType,
                        repeatMeta,
                    }
                );

                if (notificationId) {
                    await database.write(async () => {
                        await event.update(e => {
                            e.notificationId = notificationId;
                        });
                    });
                }
            }

            const taskCollection = database.get<Task>('tasks');
            const tasks = await taskCollection.query().fetch();

            for (const task of tasks) {
                if (task.status === 'done' || task.notificationId || !task.reminderEnabled) {
                    continue;
                }

                const taskDate = parseReminderDateTime(task.dateString, task.dueDisplay);
                if (!taskDate) continue;

                const triggerDate = new Date(taskDate.getTime() - defaultTaskReminder * 60000);
                if (triggerDate <= new Date()) continue;

                const notificationId = await this.scheduleNotification(
                    'tasks',
                    {
                        title: `Task: ${task.name}`,
                        body: `Due ${task.dueDisplay || 'today'}! Priority: ${task.priority}`,
                        data: { taskId: task.id },
                    },
                    triggerDate
                );

                if (notificationId) {
                    await database.write(async () => {
                        await task.update(t => {
                            t.notificationId = notificationId;
                        });
                    });
                }
            }

            console.log('✓ Notification safety check complete');
        } catch (error) {
            console.error('Failed to reschedule missing notifications:', error);
        }
    },
    computeNextDate,
    getNextWeekday,
    getNextCustomDate,
    normalizeRepeatType,
    buildRepeatMetaFromRule,
};

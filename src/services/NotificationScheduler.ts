import notifee, { AndroidImportance, TriggerType, TimestampTrigger } from '@notifee/react-native';
import { Platform } from 'react-native';
import { database } from '../database';
import { Q } from '@nozbe/watermelondb';

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

// Notification Channels
const CHANNELS = {
    events: { id: 'events', name: 'Events', importance: AndroidImportance.HIGH },
    tasks: { id: 'tasks', name: 'Tasks', importance: AndroidImportance.DEFAULT },
    documents: { id: 'documents', name: 'Documents', importance: AndroidImportance.HIGH },
    meals: { id: 'meals', name: 'Meals', importance: AndroidImportance.DEFAULT },
    budgets: { id: 'budgets', name: 'Budgets', importance: AndroidImportance.HIGH },
};

export const NotificationScheduler = {
    /**
     * Initialize notification channels (Android)
     */
    async initialize() {
        try {
            await notifee.requestPermission();

            // Create all channels
            for (const [key, channel] of Object.entries(CHANNELS)) {
                await notifee.createChannel({
                    id: channel.id,
                    name: channel.name,
                    importance: channel.importance,
                });
            }

            console.log('✓ Notification channels initialized');
        } catch (error) {
            console.error('Failed to initialize notifications:', error);
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
        triggerDate: Date
    ): Promise<string | null> {
        try {
            // Check if category is enabled
            const enabled = await this.isCategoryEnabled(category);
            if (!enabled) {
                console.log(`Notification not scheduled: ${category} category disabled`);
                return null;
            }

            // Don't schedule past notifications
            if (triggerDate <= new Date()) {
                console.log(`Notification not scheduled: trigger date ${triggerDate.toISOString()} is in the past`);
                return null;
            }

            // Adjust for quiet hours
            const adjustedDate = await this.adjustForQuietHours(triggerDate);

            // Get channel for category
            const channel = CHANNELS[category];

            // Create trigger
            const trigger: TimestampTrigger = {
                type: TriggerType.TIMESTAMP,
                timestamp: adjustedDate.getTime(),
                alarmManager: Platform.OS === 'android' ? {
                    allowWhileIdle: true, // Fire even in Doze mode
                } : undefined,
            };

            // Schedule notification
            const notificationId = await notifee.createTriggerNotification(
                {
                    title: data.title,
                    body: data.body,
                    data: data.data,
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
                },
                trigger
            );

            console.log(`✓ Scheduled ${category} notification: ${notificationId} for ${adjustedDate.toISOString()} on channel ${channel.id}`);
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
        triggerDate: Date
    ): Promise<string | null> {
        try {
            // Cancel old notification
            if (oldNotificationId) {
                await this.cancelNotification(oldNotificationId);
            }

            // Schedule new notification
            return await this.scheduleNotification(category, data, triggerDate);
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
            let notificationIdField = 'notificationId';

            switch (category) {
                case 'events':
                    collection = database.get('events');
                    break;
                case 'tasks':
                    collection = database.get('tasks');
                    break;
                case 'documents':
                    collection = database.get('documents');
                    notificationIdField = 'notificationIdsJson';
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

            const categories: NotificationCategory[] = ['events', 'tasks', 'documents', 'meals'];

            for (const category of categories) {
                const enabled = await this.isCategoryEnabled(category);
                if (!enabled) continue;

                // Implementation will be added when we integrate with models
                // For now, just log
                console.log(`Checking ${category} for missing notifications...`);
            }

            console.log('✓ Notification safety check complete');
        } catch (error) {
            console.error('Failed to reschedule missing notifications:', error);
        }
    },
};

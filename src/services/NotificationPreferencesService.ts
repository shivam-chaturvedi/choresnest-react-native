import { database } from '../database';
import NotificationPreference from '../database/models/NotificationPreference';
import QuietHours from '../database/models/QuietHours';
import { Q } from '@nozbe/watermelondb';

export type NotificationCategory = 'events' | 'tasks' | 'documents' | 'meals' | 'budgets';

interface QuietHoursSettings {
    enabled: boolean;
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
}

/**
 * NotificationPreferencesService
 * 
 * Manages user notification preferences including:
 * - Reminder times for different categories
 * - Category enable/disable toggles
 * - Quiet hours settings
 */
export const NotificationPreferencesService = {
    /**
     * Get reminder time for a specific category (in minutes)
     */
    async getReminderTime(category: NotificationCategory): Promise<number> {
        try {
            const prefs = await database.get<NotificationPreference>('notification_preferences')
                .query(Q.where('category', category))
                .fetch();

            if (prefs.length > 0) {
                return prefs[0].reminderOffsetMinutes || this.getDefaultReminderTime(category);
            }

            return this.getDefaultReminderTime(category);
        } catch (error) {
            console.error(`Error getting reminder time for ${category}:`, error);
            return this.getDefaultReminderTime(category);
        }
    },

    /**
     * Get default reminder time for category
     */
    getDefaultReminderTime(category: NotificationCategory): number {
        const defaults: Record<NotificationCategory, number> = {
            events: 30,      // 30 minutes before
            tasks: 15,       // 15 minutes before
            documents: 1440, // 1 day before
            meals: 60,       // 1 hour before
            budgets: 1440,   // 1 day before
        };
        return defaults[category] || 30;
    },

    /**
     * Save reminder time for a category
     */
    async saveReminderTime(category: NotificationCategory, minutes: number): Promise<void> {
        try {
            await database.write(async () => {
                const existing = await database.get<NotificationPreference>('notification_preferences')
                    .query(Q.where('category', category))
                    .fetch();

                if (existing.length > 0) {
                    await existing[0].update(pref => {
                        pref.reminderOffsetMinutes = minutes;
                        pref.updatedAt = Date.now();
                    });
                } else {
                    await database.get<NotificationPreference>('notification_preferences').create(pref => {
                        pref.category = category;
                        pref.enabled = true;
                        pref.reminderOffsetMinutes = minutes;
                        pref.updatedAt = Date.now();
                    });
                }
            });
            console.log(`✓ Saved ${category} reminder time: ${minutes} minutes`);
        } catch (error) {
            console.error(`Error saving reminder time for ${category}:`, error);
            throw error;
        }
    },

    /**
     * Check if a category is enabled
     */
    async isCategoryEnabled(category: NotificationCategory): Promise<boolean> {
        try {
            const prefs = await database.get<NotificationPreference>('notification_preferences')
                .query(Q.where('category', category))
                .fetch();

            if (prefs.length > 0) {
                return prefs[0].enabled;
            }

            return true; // Default to enabled
        } catch (error) {
            console.error(`Error checking if ${category} is enabled:`, error);
            return true;
        }
    },

    /**
     * Toggle a category on/off
     */
    async toggleCategory(category: NotificationCategory, enabled: boolean): Promise<void> {
        try {
            await database.write(async () => {
                const existing = await database.get<NotificationPreference>('notification_preferences')
                    .query(Q.where('category', category))
                    .fetch();

                if (existing.length > 0) {
                    await existing[0].update(pref => {
                        pref.enabled = enabled;
                        pref.updatedAt = Date.now();
                    });
                } else {
                    await database.get<NotificationPreference>('notification_preferences').create(pref => {
                        pref.category = category;
                        pref.enabled = enabled;
                        pref.reminderOffsetMinutes = this.getDefaultReminderTime(category);
                        pref.updatedAt = Date.now();
                    });
                }
            });
            console.log(`✓ ${category} notifications ${enabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error(`Error toggling ${category}:`, error);
            throw error;
        }
    },

    /**
     * Get quiet hours settings
     */
    async getQuietHours(): Promise<QuietHoursSettings | null> {
        try {
            const settings = await database.get<QuietHours>('quiet_hours').query().fetch();

            if (settings.length > 0) {
                const qh = settings[0];
                return {
                    enabled: qh.enabled,
                    startHour: qh.startHour,
                    startMinute: qh.startMinute,
                    endHour: qh.endHour,
                    endMinute: qh.endMinute,
                };
            }

            return null;
        } catch (error) {
            console.error('Error getting quiet hours:', error);
            return null;
        }
    },

    /**
     * Save quiet hours settings
     */
    async saveQuietHours(settings: QuietHoursSettings): Promise<void> {
        try {
            await database.write(async () => {
                const existing = await database.get<QuietHours>('quiet_hours').query().fetch();

                if (existing.length > 0) {
                    await existing[0].update(qh => {
                        qh.enabled = settings.enabled;
                        qh.startHour = settings.startHour;
                        qh.startMinute = settings.startMinute;
                        qh.endHour = settings.endHour;
                        qh.endMinute = settings.endMinute;
                    });
                } else {
                    await database.get<QuietHours>('quiet_hours').create(qh => {
                        qh.enabled = settings.enabled;
                        qh.startHour = settings.startHour;
                        qh.startMinute = settings.startMinute;
                        qh.endHour = settings.endHour;
                        qh.endMinute = settings.endMinute;
                    });
                }
            });
            console.log('✓ Quiet hours saved');
        } catch (error) {
            console.error('Error saving quiet hours:', error);
            throw error;
        }
    },

    /**
     * Get all preferences for display
     */
    async getAllPreferences(): Promise<{
        eventReminders: boolean;
        eventReminderTime: number;
        taskReminders: boolean;
        taskReminderTime: number;
        mealPrepReminders: boolean;
        mealPrepTime: number;
        vaultReminders: boolean;
        quietHours: QuietHoursSettings | null;
    }> {
        try {
            const [
                eventEnabled,
                eventTime,
                taskEnabled,
                taskTime,
                mealEnabled,
                mealTime,
                vaultEnabled,
                quietHours
            ] = await Promise.all([
                this.isCategoryEnabled('events'),
                this.getReminderTime('events'),
                this.isCategoryEnabled('tasks'),
                this.getReminderTime('tasks'),
                this.isCategoryEnabled('meals'),
                this.getReminderTime('meals'),
                this.isCategoryEnabled('documents'),
                this.getQuietHours()
            ]);

            return {
                eventReminders: eventEnabled,
                eventReminderTime: eventTime,
                taskReminders: taskEnabled,
                taskReminderTime: taskTime,
                mealPrepReminders: mealEnabled,
                mealPrepTime: mealTime,
                vaultReminders: vaultEnabled,
                quietHours,
            };
        } catch (error) {
            console.error('Error getting all preferences:', error);
            throw error;
        }
    },
};

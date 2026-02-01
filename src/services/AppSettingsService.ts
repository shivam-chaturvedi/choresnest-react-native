import { database } from '../database';
import AppSettings from '../database/models/AppSettings';
import { Q } from '@nozbe/watermelondb';

export const AppSettingsService = {
    getSettings: async (): Promise<AppSettings | null> => {
        const settings = await database.get<AppSettings>('app_settings').query().fetch();
        return settings.length > 0 ? settings[0] : null;
    },

    hasCompletedOnboarding: async (): Promise<boolean> => {
        const settings = await AppSettingsService.getSettings();
        return settings?.hasCompletedOnboarding ?? false;
    },

    completeOnboarding: async (): Promise<void> => {
        await database.write(async () => {
            const settingsCollection = database.get<AppSettings>('app_settings');
            const settings = await settingsCollection.query().fetch();

            if (settings.length > 0) {
                await settings[0].update(s => {
                    s.hasCompletedOnboarding = true;
                });
            } else {
                await settingsCollection.create(s => {
                    s.hasCompletedOnboarding = true;
                });
            }
        });
    },
};

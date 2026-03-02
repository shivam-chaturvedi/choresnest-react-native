import { Database } from '@nozbe/watermelondb';
import { createDatabase } from './databaseFactory';

const databaseCache = new Map<string, Database>();
let activeDatabase: Database | null = null;
let activeProfileId: string | null = null;

const DEFAULT_PROFILE_ID = 'guest';

export const setActiveProfile = (profileId: string): void => {
    if (!profileId) {
        throw new Error('setActiveProfile expects a non-empty profileId');
    }

    if (activeProfileId === profileId && activeDatabase) {
        return;
    }

    let instance = databaseCache.get(profileId);
    if (!instance) {
        instance = createDatabase(profileId);
        databaseCache.set(profileId, instance);
    }

    activeDatabase = instance;
    activeProfileId = profileId;
};

export const getDatabase = (): Database => {
    if (!activeDatabase) {
        throw new Error('Database has not been initialized for the active profile yet. Call setActiveProfile first.');
    }
    return activeDatabase;
};

export const getActiveProfileId = (): string | null => activeProfileId;

// Initialize with guest profile so the first database call always succeeds.
setActiveProfile(DEFAULT_PROFILE_ID);

export const GUEST_PROFILE_ID = DEFAULT_PROFILE_ID;

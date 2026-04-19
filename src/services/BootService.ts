import AsyncStorage from '@react-native-async-storage/async-storage';
import { GUEST_PROFILE_ID } from '../database';
import { ProfileService } from './ProfileService';

const ACTIVE_PROFILE_KEY = 'ACTIVE_PROFILE_ID';

class BootService {
    async restoreLastActiveProfile(): Promise<string> {
        // We now rely on AuthContext + ProfileResolver to deterministically 
        // load the profile. BootService just performs an initial optimistic 
        // read so the DB doesn't crash on very first query before AuthContext 
        // mounts, but we do NOT overwrite it if null.
        try {
            const cachedProfile = await AsyncStorage.getItem(ACTIVE_PROFILE_KEY);
            if (cachedProfile && cachedProfile.trim().length > 0) {
                await ProfileService.setActiveProfileId(cachedProfile);
                return cachedProfile;
            }
        } catch (error) {
            console.error('[BootService] Failed to read ACTIVE_PROFILE_ID', error);
        }

        return GUEST_PROFILE_ID;
    }
}

export const bootService = new BootService();

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GUEST_PROFILE_ID } from '../database';
import { ProfileService } from './ProfileService';

const ACTIVE_PROFILE_KEY = 'ACTIVE_PROFILE_ID';

class BootService {
    private isValidProfileId(value?: string | null): value is string {
        return typeof value === 'string' && value.trim().length > 0;
    }

    async restoreLastActiveProfile(): Promise<string> {
        try {
            const cachedProfile = await AsyncStorage.getItem(ACTIVE_PROFILE_KEY);
            const validProfile = this.isValidProfileId(cachedProfile) ? cachedProfile! : null;
            if (validProfile) {
                await ProfileService.setActiveProfileId(validProfile);
                console.log('[BootService] Restored active profile', validProfile);
                return validProfile;
            }
        } catch (error) {
            console.error('[BootService] Failed to read ACTIVE_PROFILE_ID', error);
        }

        await ProfileService.setActiveProfileId(GUEST_PROFILE_ID);
        console.log('[BootService] Falling back to guest profile');
        return GUEST_PROFILE_ID;
    }
}

export const bootService = new BootService();

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupabaseService } from './SupabaseService';
import { getDatabase } from '../database';
import UserRecord from '../database/models/User';
import { Q } from '@nozbe/watermelondb';

export interface ResolvedProfileResult {
  profileId: string;
  role?: string;
  ownerId?: string;
}

const ACTIVE_PROFILE_KEY = 'ACTIVE_PROFILE_ID';

export const ProfileResolver = {
  /**
   * Resolves the "effective profile ID" for a given user.
   * If a user is a member of another family, their effective profile ID is the owner's ID.
   * Otherwise, it's their own ID.
   */
  async resolveEffectiveProfileId(userId: string): Promise<ResolvedProfileResult> {
    try {
      // 1. Online attempt: Query Supabase
      const { data: profileData, error: profileError } = await SupabaseService.from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!profileError && profileData) {
        let profileId = profileData.id ?? userId;
        console.log('[ProfileResolver] Online fetch success', { userId, profileData });

        if (profileData.role === 'member' && profileData.owner_id && profileData.owner_id !== profileData.id) {
          profileId = profileData.owner_id;
        }

        const result: ResolvedProfileResult = {
          profileId,
          role: profileData.role,
          ownerId: profileData.owner_id,
        };

        return result;
      }

      console.warn('[ProfileResolver] Network fetch failed, checking local database...', profileError);

      // 2. Offline fallback: Query WatermelonDB
      const usersCol = getDatabase().get<UserRecord>('users');
      const localUsers = await usersCol.query(Q.where('id', userId)).fetch();

      if (localUsers.length > 0) {
        const localUser = localUsers[0];
        let profileId = localUser.id;

        if (localUser.role === 'member' && localUser.ownerId && localUser.ownerId !== localUser.id) {
          profileId = localUser.ownerId;
        } else if (localUser.activeProfileId && localUser.activeProfileId !== localUser.id) {
          profileId = localUser.activeProfileId;
        }

        console.log('[ProfileResolver] Offline DB fallback success', { userId, profileId, role: localUser.role, ownerId: localUser.ownerId });

        return {
          profileId,
          role: localUser.role,
          ownerId: localUser.ownerId,
        };
      }

      console.warn('[ProfileResolver] Local DB fetch failed, checking AsyncStorage...');

      // 3. Last Resort Fallback: AsyncStorage
      const cachedActive = await AsyncStorage.getItem(ACTIVE_PROFILE_KEY);
      if (cachedActive) {
        console.log('[ProfileResolver] AsyncStorage fallback success', { userId, cachedActive });
        return { profileId: cachedActive };
      }

    } catch (error) {
      console.error('[ProfileResolver] Unexpected error resolving member profile', error);
    }

    // Ultimate fallback
    return { profileId: userId };
  }
};

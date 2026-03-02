import { getDatabase } from '../database';
import AppSettings from '../database/models/AppSettings';
import { Q } from '@nozbe/watermelondb';
import { EMPTY } from 'rxjs';
import { SyncService } from './SyncService';
import { supabase } from '../config/supabase';
import { ProfileService } from './ProfileService';

const OBSERVE_COLUMNS: string[] = ['updated_at', 'deleted'];

const syncAfterWrite = () => {
  void SyncService.requestSyncSoon();
};

const fetchActiveProfileId = ProfileService.getActiveProfileId;

const resolveProfileId = async (profileId?: string | null): Promise<string | null> => {
  return profileId ?? await fetchActiveProfileId();
};

export const AppSettingsService = {
  getActiveProfileId: fetchActiveProfileId,
  observeSettings: (profileId?: string | null) => {
    if (!profileId) {
      return EMPTY;
    }
    const query = getDatabase().get<AppSettings>('app_settings').query(
      Q.where('profile_id', profileId),
      Q.where('deleted', false),
      Q.sortBy('updated_at', Q.desc)
    );
    return query.observeWithColumns(OBSERVE_COLUMNS);
  },

  getSettings: async (profileId?: string | null): Promise<AppSettings | null> => {
    const resolvedProfileId = await resolveProfileId(profileId);
    if (!resolvedProfileId) {
      return null;
    }
    const records = await getDatabase().get<AppSettings>('app_settings').query(
      Q.where('profile_id', resolvedProfileId),
      Q.where('deleted', false),
      Q.sortBy('updated_at', Q.desc)
    ).fetch();
    return records.length > 0 ? records[0] : null;
  },

  hasCompletedOnboarding: async (profileId?: string | null): Promise<boolean> => {
    const settings = await AppSettingsService.getSettings(profileId);
    return settings?.hasCompletedOnboarding ?? false;
  },

  hasAnyProfileCompletedOnboarding: async (): Promise<boolean> => {
    try {
      const records = await getDatabase().get<AppSettings>('app_settings').query(
        Q.where('has_completed_onboarding', true),
        Q.where('deleted', false)
      ).fetch();
      return records.length > 0;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Silently ignore errors that happen when the database is being reset (e.g. on logout).
      if (errorMessage.includes('underlyingAdapter') || errorMessage.includes('database is being reset')) {
        return false;
      }
      console.error('AppSettingsService: Error checking global onboarding status:', error);
      return false;
    }
  },

  completeOnboarding: async (profileId?: string | null): Promise<void> => {
    const resolvedProfileId = await resolveProfileId(profileId);
    if (!resolvedProfileId) {
      console.warn('AppSettingsService: Cannot complete onboarding without profile_id');
      return;
    }
    const now = Date.now();
    await getDatabase().write(async () => {
      const settingsCollection = getDatabase().get<AppSettings>('app_settings');
      const records = await settingsCollection.query(
        Q.where('profile_id', resolvedProfileId),
        Q.where('deleted', false)
      ).fetch();

      if (records.length > 0) {
        await records[0].update(record => {
          record.hasCompletedOnboarding = true;
          record.updatedAt = now;
          record.version = (record.version ?? 0) + 1;
          record.deleted = false;
        });
      } else {
        await settingsCollection.create(record => {
          record.profileId = resolvedProfileId;
          record.hasCompletedOnboarding = true;
          record.createdAt = now;
          record.updatedAt = now;
          record.version = 1;
          record.deleted = false;
        });
      }
    });
    syncAfterWrite();
  },
};

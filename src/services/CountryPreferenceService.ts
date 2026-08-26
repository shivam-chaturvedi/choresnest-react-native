import { getDatabase } from '../database';
import UserPreference from '../database/models/UserPreference';
import {
  COUNTRY_CONFIG,
  DEFAULT_COUNTRY_CODE,
  CountryConfiguration,
  getCountryConfig,
  isSupportedCountry,
} from '../config/countries';
import * as RNLocalize from 'react-native-localize';
import { SyncService } from './SyncService';
import { AppSettingsService } from './AppSettingsService';
import { Q } from '@nozbe/watermelondb';

type CountryChangeListener = (config: CountryConfiguration) => void;

const detectDeviceCountryCode = (): string | undefined => {
  try {
    const deviceTimeZone = RNLocalize.getTimeZone();
    if (deviceTimeZone) {
      const zoneMatch = Object.values(COUNTRY_CONFIG).find(
        config => config.timeZone === deviceTimeZone,
      );
      if (zoneMatch) {
        return zoneMatch.code;
      }
    }

    const deviceCountry = RNLocalize.getCountry();
    if (deviceCountry && isSupportedCountry(deviceCountry)) {
      return deviceCountry;
    }

    const locales = RNLocalize.getLocales();
    const localeMatch = locales.find(
      locale => locale.countryCode && isSupportedCountry(locale.countryCode),
    );
    if (localeMatch?.countryCode) {
      return localeMatch.countryCode;
    }
  } catch (error) {
    console.warn(
      'CountryPreferenceService: device locale detection failed',
      error,
    );
  }

  return undefined;
};

const fallbackCountryCode = detectDeviceCountryCode() ?? DEFAULT_COUNTRY_CODE;
const preferencesCollection = () =>
  getDatabase().get<UserPreference>('user_preferences');

let cachedCountryCode = fallbackCountryCode;
let preferenceRecordId: string | null = null;
const listeners = new Set<CountryChangeListener>();

const notifyListeners = () => {
  const config = getCountryConfig(cachedCountryCode);
  listeners.forEach(listener => {
    try {
      listener(config);
    } catch (error) {
      console.warn('CountryPreferenceService listener error', error);
    }
  });
};

const getOrCreatePreferenceRecord = async (): Promise<UserPreference> => {
  const collection = preferencesCollection();
  if (preferenceRecordId) {
    try {
      const record = await collection.find(preferenceRecordId);
      return record;
    } catch (error) {
      console.warn('Failed to find cached user preference record', error);
      preferenceRecordId = null;
    }
  }

  const existing = await collection.query().fetch();
  if (existing.length > 0) {
    preferenceRecordId = existing[0].id;
    return existing[0];
  }

  return await getDatabase().write(async () => {
    const created = await collection.create(pref => {
      pref.countryCode = cachedCountryCode;
      pref.createdAt = Date.now();
      pref.updatedAt = Date.now();
    });
    preferenceRecordId = created.id;
    return created;
  });
};

export const CountryPreferenceService = {
  async loadPreferences() {
    try {
      const record = await getOrCreatePreferenceRecord();
      const normalized =
        record.countryCode && isSupportedCountry(record.countryCode)
          ? record.countryCode
          : cachedCountryCode;
      if (!record.countryCode || record.countryCode !== normalized) {
        await getDatabase().write(async () => {
          await record.update(pref => {
            pref.countryCode = normalized;
            pref.updatedAt = Date.now();
          });
        });
      }
      cachedCountryCode = normalized;
      notifyListeners();
    } catch (error) {
      console.error('Failed to load country preferences:', error);
    }
  },

  getCurrentCountryCode(): string {
    return cachedCountryCode;
  },

  getCurrentCountry(): CountryConfiguration {
    return getCountryConfig(cachedCountryCode);
  },

  getCurrencySymbol(): string {
    return this.getCurrentCountry().currencySymbol;
  },

  getCurrencyCode(): string {
    return this.getCurrentCountry().currencyCode;
  },

  getLocale(): string {
    return this.getCurrentCountry().locale;
  },

  getTimeZone(): string {
    return this.getCurrentCountry().timeZone;
  },

  async setCountry(code: string): Promise<void> {
    const normalized = isSupportedCountry(code) ? code : DEFAULT_COUNTRY_CODE;
    try {
      // First update user_preferences for backward compatibility
      const record = await getOrCreatePreferenceRecord();
      await getDatabase().write(async () => {
        await record.update(pref => {
          pref.countryCode = normalized;
          pref.updatedAt = Date.now();
          pref.version = (pref.version ?? 0) + 1;
        });
      });

      // NOW ALSO store it in Settings table as key-value pair for Supabase Sync
      const settingsCollection = getDatabase().get('settings');
      const profileId = await AppSettingsService.getActiveProfileId();

      if (profileId) {
        const existingSettings = await settingsCollection
          .query(
            Q.where('profile_id', profileId),
            Q.where('key', 'localization'),
          )
          .fetch();

        await getDatabase().write(async () => {
          if (existingSettings.length > 0) {
            await existingSettings[0].update((s: any) => {
              s.value = normalized;
              s.updatedAt = Date.now();
              s.version = (s.version || 0) + 1;
            });
          } else {
            await settingsCollection.create((s: any) => {
              s.profileId = profileId;
              s.key = 'localization';
              s.value = normalized;
              s.createdAt = Date.now();
              s.updatedAt = Date.now();
              s.version = 1;
            });
          }
        });
      }

      cachedCountryCode = normalized;
      notifyListeners();
      void SyncService.requestSyncNow();
    } catch (error) {
      console.error('Failed to update country preference:', error);
    }
  },

  subscribe(listener: CountryChangeListener): () => void {
    listeners.add(listener);
    listener(this.getCurrentCountry());
    return () => listeners.delete(listener);
  },

  listAvailableCountries(): CountryConfiguration[] {
    return Object.values(COUNTRY_CONFIG);
  },
};

import { database } from '../database';
import UserPreference from '../database/models/UserPreference';
import { COUNTRY_CONFIG, DEFAULT_COUNTRY_CODE, CountryConfiguration, getCountryConfig, isSupportedCountry } from '../config/countries';

type CountryChangeListener = (config: CountryConfiguration) => void;

const preferencesCollection = () => database.get<UserPreference>('user_preferences');

let cachedCountryCode = DEFAULT_COUNTRY_CODE;
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

    return await database.write(async () => {
        const created = await collection.create(pref => {
            pref.countryCode = DEFAULT_COUNTRY_CODE;
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
            cachedCountryCode = record.countryCode || DEFAULT_COUNTRY_CODE;
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
            const record = await getOrCreatePreferenceRecord();
            await database.write(async () => {
                await record.update(pref => {
                    pref.countryCode = normalized;
                    pref.updatedAt = Date.now();
                });
            });
            cachedCountryCode = normalized;
            notifyListeners();
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

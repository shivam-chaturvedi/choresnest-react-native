import { database } from '../database';
import AppLock from '../database/models/AppLock';

const PIN_SALT = 'family-chores-p@ss';

export const hashPin = (pin: string) => {
    const normalized = (pin || '').trim();
    if (!normalized) return '';
    return [...`${normalized}${PIN_SALT}`]
        .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('');
};

interface UpdatePayload {
    enabled?: boolean;
    biometricEnabled?: boolean;
    pinHash?: string;
}

class AppLockService {
    async getRecord() {
        const records = await database.get<AppLock>('app_lock').query().fetch();
        return records[0] || null;
    }

    private async ensureRecord() {
        const existing = await this.getRecord();
        if (existing) return existing;
        let created: AppLock | null = null;
        await database.write(async () => {
            created = await database.get<AppLock>('app_lock').create(lock => {
                lock.enabled = false;
                lock.biometricEnabled = false;
                lock.pinHash = '';
                lock.createdAt = Date.now();
                lock.updatedAt = Date.now();
            });
        });
        return created!;
    }

    async updateRecord(payload: UpdatePayload) {
        const record = await this.ensureRecord();
        const timestamp = Date.now();
        await database.write(async () => {
            await record.update(lock => {
                if (payload.enabled !== undefined) {
                    lock.enabled = payload.enabled;
                }
                if (payload.biometricEnabled !== undefined) {
                    lock.biometricEnabled = payload.biometricEnabled;
                }
                if (payload.pinHash !== undefined) {
                    lock.pinHash = payload.pinHash;
                }
                lock.updatedAt = timestamp;
            });
        });
        return this.getRecord();
    }

    async setPin(pin: string) {
        const payload: UpdatePayload = {
            pinHash: hashPin(pin),
            enabled: true,
        };
        return this.updateRecord(payload);
    }

    async enableAppLock() {
        return this.updateRecord({ enabled: true });
    }

    async disableAppLock() {
        return this.updateRecord({ enabled: false });
    }

    async enableBiometric() {
        return this.updateRecord({ biometricEnabled: true, enabled: false });
    }

    async disableBiometric() {
        return this.updateRecord({ biometricEnabled: false });
    }
}

export const appLockService = new AppLockService();

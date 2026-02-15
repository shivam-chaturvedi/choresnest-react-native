import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class AppLock extends Model {
    static table = 'app_lock';

    @field('enabled') enabled!: boolean;
    @field('biometric_enabled') biometricEnabled!: boolean;
    @field('pin_hash') pinHash!: string;
    @field('created_at') createdAt!: number;
    @field('updated_at') updatedAt!: number;
    @field('version') version!: number;
}

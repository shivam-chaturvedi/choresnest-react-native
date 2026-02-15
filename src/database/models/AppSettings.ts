import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class AppSettings extends Model {
    static table = 'app_settings';

    @field('has_completed_onboarding') hasCompletedOnboarding!: boolean;
    @field('version') version!: number;
}

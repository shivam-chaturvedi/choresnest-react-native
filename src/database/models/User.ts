import { Model } from '@nozbe/watermelondb';
import { field, text, json } from '@nozbe/watermelondb/decorators';

export default class User extends Model {
    static table = 'users';

    @text('email') email!: string;
    @text('name') name!: string;
    @field('is_guest') isGuest!: boolean;
    @field('has_completed_onboarding') hasCompletedOnboarding!: boolean;
    @text('active_profile_id') activeProfileId!: string;
}

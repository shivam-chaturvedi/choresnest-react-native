import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class User extends Model {
    static table = 'users';

    @text('email') email!: string;
    @text('name') name!: string;
    @field('is_guest') isGuest!: boolean;
    @field('has_completed_onboarding') hasCompletedOnboarding!: boolean;
    @text('active_profile_id') activeProfileId!: string;
    @text('symbol') symbol!: string;
    @text('color') color!: string;
    @text('role') role!: string;
    @field('is_active') isActive!: boolean;
    @text('owner_id') ownerId!: string;
    @field('created_at') createdAt!: number;
    @field('updated_at') updatedAt!: number;
    @field('deleted') deleted!: boolean;
    @field('version') version!: number;
}

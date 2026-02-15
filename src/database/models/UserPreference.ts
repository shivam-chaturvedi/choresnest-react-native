import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class UserPreference extends Model {
    static table = 'user_preferences';

    @field('country_code')
    countryCode!: string;

    @field('created_at')
    createdAt!: number;

    @field('updated_at')
    updatedAt!: number;
    @field('version') version!: number;
}

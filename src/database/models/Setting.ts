import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class Setting extends Model {
    static table = 'settings';

    @text('key') key!: string;
    @text('value') value!: string;
    @field('version') version!: number;
    @field('profile_id') profileId!: string;
    @field('created_at') createdAt!: number;
    @field('updated_at') updatedAt!: number;
    @field('deleted') deleted!: boolean;
}

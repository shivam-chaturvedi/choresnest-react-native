import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class Setting extends Model {
    static table = 'settings';

    @text('key') key!: string;
    @text('value') value!: string;
    @field('version') version!: number;
}

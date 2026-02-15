import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class Member extends Model {
    static table = 'members';

    @text('name') name!: string;
    @text('symbol') symbol!: string;
    @text('color') color!: string;
    @text('role') role!: string;
    @field('is_active') isActive!: boolean;
    @field('version') version!: number;
}

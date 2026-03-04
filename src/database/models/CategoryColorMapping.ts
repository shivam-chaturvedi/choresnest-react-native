import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class CategoryColorMapping extends Model {
    static table = 'budget_category_color_mappings';

    @text('profile_id') profileId!: string;
    @text('category_key') categoryKey!: string;
    @text('color_hex') colorHex!: string;
    @field('created_at') createdAt!: number;
    @field('updated_at') updatedAt!: number;
    @field('deleted') deleted!: boolean;
    @field('version') version!: number;
}

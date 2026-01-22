import { Model } from '@nozbe/watermelondb';
import { field, text, children, relation } from '@nozbe/watermelondb/decorators';

export class List extends Model {
    static table = 'lists';
    static associations = {
        list_items: { type: 'has_many' as const, foreignKey: 'list_id' },
    }

    @text('name') name!: string;
    @text('type') type!: string;
    @text('icon') icon?: string;

    @children('list_items') items: any;
}

export class ListItem extends Model {
    static table = 'list_items';
    static associations = {
        lists: { type: 'belongs_to' as const, key: 'list_id' },
    }

    @relation('lists', 'list_id') list!: List;
    @text('name') name!: string;
    @field('quantity') quantity!: number;
    @text('unit') unit!: string;
    @text('category_id') categoryId?: string;
    @text('added_by_id') addedById!: string;
    @field('is_completed') isCompleted!: boolean;
    @field('purchased_at') purchasedAt?: number;
}

export class ListCategory extends Model {
    static table = 'list_categories';

    @text('name') name!: string;
    @text('icon') icon!: string;
    @text('color') color!: string;
}

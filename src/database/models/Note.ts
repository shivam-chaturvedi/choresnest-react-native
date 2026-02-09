import { Model } from '@nozbe/watermelondb';
import { field, text, json, relation } from '@nozbe/watermelondb/decorators';

export class Folder extends Model {
    static table = 'folders';

    @text('title') title!: string;
    @text('icon') icon!: string;
}

export class Note extends Model {
    static table = 'notes';

    @text('title') title!: string;
    @text('preview') preview!: string;
    @text('tag') tag?: string;
    @text('color') color!: string;
    @field('is_starred') isStarred!: boolean;
    @field('updated_at') updatedAt!: number;
    @text('folder_id') folderId!: string;
    @field('created_at') createdAt!: number;

    @json('blocks_json', (json: any) => json) blocks!: any[];
}

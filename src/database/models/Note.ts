import { Model } from '@nozbe/watermelondb';
import { field, text, json, relation } from '@nozbe/watermelondb/decorators';

export class Folder extends Model {
    static table = 'folders';

    @text('title') title!: string;
    @text('icon') icon!: string;
    @text('profile_id') profileId!: string;
    @field('deleted') deleted!: boolean;
    @field('created_at') createdAt!: number;
    @field('updated_at') updatedAt!: number;
    @field('version') version!: number;
}

export class Note extends Model {
    static table = 'notes';

    @text('title') title!: string;
    @text('preview') preview!: string;
    @text('tag') tag?: string;
    @text('color') color!: string;
    @field('is_starred') isStarred!: boolean;
    @text('profile_id') profileId!: string;
    @field('updated_at') updatedAt!: number;
    @text('folder_id') folderId!: string;
    @field('created_at') createdAt!: number;
    @field('deleted') deleted!: boolean;

    @json('blocks_json', (json: any) => json) blocks!: any[];
    @field('version') version!: number;
}

// Acceptance Checklist:
// - Device A creates/updates/deletes folders/notes; Device B sees the changes via tombstones and profile-aware sync.

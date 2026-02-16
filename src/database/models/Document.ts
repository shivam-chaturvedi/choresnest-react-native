import { Model } from '@nozbe/watermelondb';
import { field, text, json } from '@nozbe/watermelondb/decorators';

export default class Document extends Model {
    static table = 'documents';

    @text('profile_id') profileId!: string;
    @text('name') name!: string;
    @text('type') type!: string;
    @text('icon') icon?: string;
    @text('date') date!: string;
    @text('expiry_date') expiryDate?: string;
    @text('member_id') memberId?: string;
    @json('shared_with_json', (json: any) => json) sharedWithIds!: string[];
    @text('file_path') filePath?: string;
    @json('meta_json', (json: any) => json) meta!: any;
    @text('notification_ids_json') notificationIdsJson?: string;
    @field('reminder_days_before') reminderDaysBefore?: number;
    @field('version') version!: number;
    @field('created_at') createdAt!: number;
    @field('updated_at') updatedAt!: number;
    @field('deleted') deleted!: boolean;
}

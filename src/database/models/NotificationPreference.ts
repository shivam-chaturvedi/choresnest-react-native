import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class NotificationPreference extends Model {
    static table = 'notification_preferences';

    @field('category') category!: string;
    @field('enabled') enabled!: boolean;
    @field('reminder_offset_minutes') reminderOffsetMinutes!: number;
    @field('updated_at') updatedAt!: number;
    @field('version') version!: number;
}

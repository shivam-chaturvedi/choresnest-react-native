import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class Task extends Model {
    static table = 'tasks';

    @text('name') name!: string;
    @text('icon') icon!: string;
    @text('status') status!: string;
    @text('priority') priority!: string;
    @text('due_display') dueDisplay!: string;
    @text('date') dateString!: string;
    @text('assignee_id') assigneeId!: string;
    @text('profile_id') profileId?: string;
    @text('tab') tab!: string;
    @text('notification_id') notificationId?: string;
    @field('reminder_enabled') reminderEnabled!: boolean;
    @field('updated_at') updatedAt!: number;
    @field('created_at') createdAt!: number;
    @field('version') version!: number;
}

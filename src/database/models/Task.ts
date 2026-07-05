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
    @field('is_recurring') isRecurring!: boolean;
    @text('recurrence_rule') recurrenceRule?: string;
    @field('recurrence_interval') recurrenceInterval?: number;
    @text('recurrence_days_of_week') recurrenceDaysOfWeek?: string;
    @text('recurrence_end_date') recurrenceEndDate?: string;
    @field('recurrence_occurrence_limit') recurrenceOccurrenceLimit?: number;
    @field('recurrence_completed_count') recurrenceCompletedCount!: number;
    @text('recurrence_anchor_date') recurrenceAnchorDate?: string;
    @text('recurrence_skipped_dates') recurrenceSkippedDates?: string;
    @field('updated_at') updatedAt!: number;
    @field('created_at') createdAt!: number;
    @field('version') version!: number;
    @field('deleted') deleted!: boolean;
}

import { Model } from '@nozbe/watermelondb';
import { field, text, date } from '@nozbe/watermelondb/decorators';

export default class Event extends Model {
    static table = 'events';

    @text('title') title!: string;
    @text('icon') icon!: string;
    @text('date') dateString!: string;
    @text('time') time!: string;
    @text('end_time') endTime?: string;
    @text('end_date') endDate?: string;
    @text('member_id') memberId!: string;
    @text('location') location?: string;
    @text('description') description?: string;
    @text('notes') notes?: string;
    @text('visibility') visibility!: string;
    @text('time_zone') timeZone?: string;
    @field('is_recurring') isRecurring!: boolean;
    @text('recurrence_rule') recurrenceRule?: string;
    @text('recurrence_end_date') recurrenceEndDate?: string;
    @text('notification_id') notificationId?: string;
    @field('reminder_offset_minutes') reminderOffsetMinutes?: number;
}

import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class QuietHours extends Model {
    static table = 'quiet_hours';

    @field('enabled') enabled!: boolean;
    @field('start_hour') startHour!: number;
    @field('start_minute') startMinute!: number;
    @field('end_hour') endHour!: number;
    @field('end_minute') endMinute!: number;
    @field('version') version!: number;
}

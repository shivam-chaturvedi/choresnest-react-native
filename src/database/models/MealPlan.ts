import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class MealPlan extends Model {
    static table = 'meal_plans';

    @text('date') date!: string; // YYYY-MM-DD
    @text('type') type!: string; // breakfast, lunch, dinner, snack
    @text('recipe_id') recipeId!: string;
    @field('is_cooked') isCooked!: boolean;
    @text('notification_id') notificationId?: string;
    @field('reminder_minutes_before') reminderMinutesBefore?: number;
    @field('version') version!: number;
}

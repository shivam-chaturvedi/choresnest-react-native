import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class MealPlan extends Model {
    static table = 'meal_plans';

    @text('date') date!: string;
    @text('type') type!: string; // breakfast, lunch, dinner, snack
    @text('recipe_id') recipeId!: string;
    @field('is_cooked') isCooked!: boolean;
}

import { Model, Q } from '@nozbe/watermelondb';
import { field, text, json, children, lazy } from '@nozbe/watermelondb/decorators';

export class Recipe extends Model {
    static table = 'recipes';
    static associations = {
        collection_recipes: { type: 'has_many' as const, foreignKey: 'recipe_id' },
    }

    @text('profile_id') profileId!: string;
    @text('name') name!: string;
    @text('description') description?: string;
    @text('prep_time') prepTime!: string;
    @text('cook_time') cookTime!: string;
    @field('servings') servings!: number;
    @text('difficulty') difficulty?: string;
    @text('calories') calories?: string;
    @text('image_path') imagePath?: string | null;
    @field('is_saved') isSaved!: boolean;
    @field('rating') rating?: number;
    @text('author') author?: string;

    @json('ingredients_json', (json: any) => json) ingredients!: any[];
    @json('instructions_json', (json: any) => json) instructions?: any[];
    @json('tags_json', (json: any) => json) tags!: string[];
    @json('nutrition_json', (json: any) => json) nutrition?: any;
    @json('images_json', (json: any) => json) images?: string[];
    @json('local_image_uris', (json: any) => json ?? []) localImageUris!: any[];
    @json('remote_image_paths', (json: any) => json ?? []) remoteImagePaths?: string[];
    @text('remote_audio_path') remoteAudioPath?: string;
    @text('audio_path') audioPath?: string;
    @text('local_audio_uri') localAudioUri?: string;
    @text('upload_status') uploadStatus!: string;
    @field('upload_attempts') uploadAttempts!: number;
    @text('last_upload_error') lastUploadError?: string;
    @field('duration') duration?: number;
    @text('url') url?: string;
    @field('created_at') createdAt!: number;
    @field('updated_at') updatedAt!: number;
    @field('deleted') deleted!: boolean;
    @field('version') version!: number;

    @children('collection_recipes') collectionRecipes: any;
}

export class Collection extends Model {
    static table = 'collections';
    static associations = {
        collection_recipes: { type: 'has_many' as const, foreignKey: 'collection_id' },
    }

    @text('profile_id') profileId!: string;
    @text('name') name!: string;
    @text('description') description?: string;
    @text('color') color!: string;
    @field('created_at') createdAt!: number;
    @field('updated_at') updatedAt!: number;
    @field('deleted') deleted!: boolean;
    @field('version') version!: number;

    @children('collection_recipes') collectionRecipes: any;
}

export class CollectionRecipe extends Model {
    static table = 'collection_recipes';
    static associations = {
        collections: { type: 'belongs_to' as const, key: 'collection_id' },
        recipes: { type: 'belongs_to' as const, key: 'recipe_id' },
    }

    @text('profile_id') profileId!: string;
    @text('collection_id') collectionId!: string;
    @text('recipe_id') recipeId!: string;
    @field('created_at') createdAt!: number;
    @field('updated_at') updatedAt!: number;
    @field('deleted') deleted!: boolean;
    @field('version') version!: number;
}

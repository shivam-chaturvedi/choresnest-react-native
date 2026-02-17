export interface Ingredient {
    name: string;
    quantity: number;
    unit: string;
}

export interface RecipeNutrition {
    kcal: string;
    protein: string;
    carbs: string;
    fats: string;
}

export interface Recipe {
    id: number;
    name: string;
    image?: string;
    time: string;
    servings: number;
    tags: string[];
    saved: boolean;
    ingredients: Ingredient[];
    nutrition?: RecipeNutrition;
    audio?: string;
    duration?: number;
    url?: string;
    images?: string[];
    countryCode?: string;
    uploadStatus?: string;
    localImageUris?: string[];
    localAudioUri?: string;
    remoteImagePaths?: string[];
    remoteAudioPath?: string;
    uploadAttempts?: number;
    lastUploadError?: string;
    description?: string;
    instructions?: string[];
}

export interface RecipeCollection {
    id: number;
    name: string;
    description?: string;
    count: number;
    color: string;
    recipeIds?: number[];
}

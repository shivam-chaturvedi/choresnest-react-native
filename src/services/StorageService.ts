import { supabase } from '../config/supabase';

const IMAGE_BUCKET = 'recipe-images';
const AUDIO_BUCKET = 'recipe-audio';
const THUMBNAIL_BUCKET = 'recipe-thumbnails';

export type RecipeAssetFile = {
    uri: string;
    name?: string;
    type?: string;
};

const getFileNameFromUri = (uri: string): string => {
    const cleaned = uri.split(/[?#]/)[0];
    const segments = cleaned.split('/');
    const candidate = segments.pop() ?? 'file';
    return candidate || 'file';
};

const sanitizeFileName = (value: string): string => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
        return 'file';
    }
    return trimmed.replace(/[^a-zA-Z0-9._-]/g, '_');
};

const inferMimeType = (fileName: string): string | undefined => {
    const cleaned = fileName.split('?')[0].split('#')[0];
    const segments = cleaned.split('.');
    if (segments.length < 2) {
        return undefined;
    }
    const extension = segments.pop()?.toLowerCase();
    if (!extension) {
        return undefined;
    }
    switch (extension) {
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'png':
            return 'image/png';
        case 'gif':
            return 'image/gif';
        case 'webp':
            return 'image/webp';
        case 'm4a':
            return 'audio/m4a';
        case 'mp3':
            return 'audio/mpeg';
        case 'wav':
            return 'audio/wav';
        default:
            return undefined;
    }
};

const resolveContentType = (file: RecipeAssetFile, blob: Blob, fileName: string): string | undefined => {
    if (file.type) {
        return file.type;
    }
    if (blob.type) {
        return blob.type;
    }
    return inferMimeType(fileName);
};

const getExtensionFromUri = (uri: string): string => {
    const cleaned = uri.split(/[?#]/)[0];
    const match = cleaned.match(/\\.([a-zA-Z0-9]+)$/);
    const rawExtension = match?.[1]?.toLowerCase() ?? '';
    const sanitized = rawExtension.replace(/[^a-z0-9]/g, '');
    if (sanitized.length > 0) {
        return sanitized;
    }
    return 'm4a';
};

const ensureBlob = async (uri: string): Promise<Blob> => {
    const response = await fetch(uri);
    if (!response.ok) {
        throw new Error(`Failed to load asset for upload: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    return blob;
};

const buildUploadPath = (profileId: string, recipeId: string, fileName: string): string => {
    const timestamp = Date.now();
    return `${profileId}/${recipeId}/${timestamp}_${fileName}`;
};

const uploadBlob = async (bucket: string, path: string, blob: Blob, contentType?: string): Promise<void> => {
    const options: { upsert: boolean; contentType?: string } = {
        upsert: false,
    };
    if (contentType) {
        options.contentType = contentType;
    }
    const { error } = await supabase.storage.from(bucket).upload(path, blob, options);
    if (error) {
        throw new Error(`Failed to upload to ${bucket}/${path}: ${error.message ?? error.toString()}`);
    }
};

const getPublicUrl = (bucket: string, path: string): string => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    if (!data || !data.publicUrl) {
        throw new Error(`Public URL missing for ${bucket}/${path}`);
    }
    return data.publicUrl;
};

const requireContext = (profileId: string, recipeId: string): void => {
    if (!profileId) {
        throw new Error('StorageService: Missing profile id');
    }
    if (!recipeId) {
        throw new Error('StorageService: Missing recipe id');
    }
};

export const uploadRecipeImage = async (profileId: string, recipeId: string, file: RecipeAssetFile): Promise<string> => {
    requireContext(profileId, recipeId);
    const blob = await ensureBlob(file.uri);
    const fileName = sanitizeFileName(file.name ?? getFileNameFromUri(file.uri));
    const path = buildUploadPath(profileId, recipeId, fileName);
    const contentType = resolveContentType(file, blob, fileName);
    await uploadBlob(IMAGE_BUCKET, path, blob, contentType);
    return getPublicUrl(IMAGE_BUCKET, path);
};

export const uploadMultipleRecipeImages = async (
    profileId: string,
    recipeId: string,
    files: RecipeAssetFile[]
): Promise<string[]> => {
    if (files.length === 0) {
        return [];
    }
    const results: string[] = [];
    for (const file of files) {
        const url = await uploadRecipeImage(profileId, recipeId, file);
        results.push(url);
    }
    return results;
};

export const uploadRecipeAudio = async (profileId: string, recipeId: string, file: RecipeAssetFile): Promise<string> => {
    requireContext(profileId, recipeId);
    const blob = await ensureBlob(file.uri);
    const extension = getExtensionFromUri(file.uri);
    const audioFileName = `${Date.now()}.${extension}`;
    const path = buildUploadPath(profileId, recipeId, audioFileName);
    const contentType = resolveContentType(file, blob, audioFileName);
    await uploadBlob(AUDIO_BUCKET, path, blob, contentType);
    return getPublicUrl(AUDIO_BUCKET, path);
};

export { IMAGE_BUCKET, AUDIO_BUCKET, THUMBNAIL_BUCKET };

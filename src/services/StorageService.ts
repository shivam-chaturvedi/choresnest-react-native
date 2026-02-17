import { supabase } from '../config/supabase';
import RNFS from 'react-native-fs';
import NetInfo from '@react-native-community/netinfo';
import { uuidv4 } from '../utils/uuid';
import { decode } from '../utils/base64';

const IMAGE_BUCKET = 'recipe-images';
const AUDIO_BUCKET = 'recipe-audio';
const THUMBNAIL_BUCKET = 'recipe-thumbnails';
const PUBLIC_BUCKETS = new Set<string>([IMAGE_BUCKET, AUDIO_BUCKET, THUMBNAIL_BUCKET]);
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_AUDIO_SIZE = 10 * 1024 * 1024;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;
const RETRY_JITTER_MS = 250;
const OFFLINE_ERROR_CODE = 'OFFLINE';
const RETRY_STATUS_CODES = new Set<number>([429]);
const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'audio/m4a': 'm4a',
  'audio/mp3': 'mp3',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
};

export type RecipeAssetFile = {
  uri: string;
  name?: string;
  type?: string;
};

type PreparedUpload = {
  filePath: string;
  uploadUri: string;
  cleanup?: () => Promise<void>;
};

type UploadFormDataFile = {
  uri: string;
  name: string;
  type: string;
};

type StorageServiceError = Error & {
  code?: string;
  status?: number;
  supabaseError?: any;
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

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

const resolveContentType = (file: RecipeAssetFile, fileName: string): string | undefined => {
  if (file.type) {
    return file.type;
  }
  return inferMimeType(fileName);
};

const getExtensionFromUri = (uri: string, fallback = 'm4a'): string => {
  const cleaned = uri.split(/[?#]/)[0];
  const match = cleaned.match(/\.([a-zA-Z0-9]+)$/);
  const rawExtension = match?.[1]?.toLowerCase() ?? '';
  const sanitized = rawExtension.replace(/[^a-z0-9]/g, '');
  if (sanitized.length > 0) {
    return sanitized;
  }
  return fallback;
};

const stripFileScheme = (value: string): string => {
  if (!value) {
    return value;
  }
  if (value.startsWith('file://')) {
    return value.slice('file://'.length);
  }
  if (value.startsWith('file:/')) {
    return value.slice('file:/'.length);
  }
  return value;
};

const toFileUri = (path: string): string => {
  if (!path) {
    return path;
  }
  if (path.startsWith('file://')) {
    return path;
  }
  if (path.startsWith('file:/')) {
    return `file://${stripFileScheme(path)}`;
  }
  return `file://${path}`;
};

const ensureFileNameWithExtension = (
  name: string,
  contentType?: string,
  fallbackExtension?: string
): string => {
  if (name.includes('.') && name.lastIndexOf('.') !== 0) {
    return name;
  }
  const extensionFromMime = contentType ? MIME_EXTENSION_MAP[contentType] : undefined;
  const rawExtension = extensionFromMime ?? fallbackExtension ?? contentType?.split('/').pop();
  if (!rawExtension) {
    return name;
  }
  const sanitizedExtension = rawExtension.replace(/[^a-z0-9]/gi, '').toLowerCase();
  if (sanitizedExtension.length === 0) {
    return name;
  }
  return `${name}.${sanitizedExtension}`;
};

const createOfflineError = (): StorageServiceError => {
  const error = new Error('StorageService: No internet connection') as StorageServiceError;
  Object.assign(error, { code: OFFLINE_ERROR_CODE });
  return error;
};

const ensureOnline = async (): Promise<void> => {
  const state = await NetInfo.fetch();
  if (!(state.isConnected && state.isInternetReachable !== false)) {
    throw createOfflineError();
  }
};

const enforceFileSizeLimit = async (filePath: string, maxBytes: number): Promise<void> => {
  const stats = await RNFS.stat(filePath);
  if (Number(stats.size) > maxBytes) {
    throw new Error(`File exceeds maximum upload size of ${maxBytes} bytes`);
  }
};

const prepareUploadUri = async (uri: string): Promise<PreparedUpload> => {
  if (uri.startsWith('content://')) {
    const extension = getExtensionFromUri(uri, 'tmp');
    const tempPath = `${RNFS.TemporaryDirectoryPath}/${uuidv4()}.${extension}`;
    try {
      await RNFS.copyFile(uri, tempPath);
    } catch (initialError) {
      try {
        const stats = await RNFS.stat(uri);
        const original = (stats as any)?.originalFilepath ?? stats.path;
        if (!original) {
          throw initialError;
        }
        await RNFS.copyFile(original, tempPath);
      } catch (fallbackError) {
        throw fallbackError ?? initialError;
      }
    }
    return {
      filePath: tempPath,
      uploadUri: toFileUri(tempPath),
      cleanup: async () => {
        try {
          await RNFS.unlink(tempPath);
        } catch (error) {
          // ignore cleanup failures
        }
      },
    };
  }

  const normalizedPath = stripFileScheme(uri);
  const uploadUri = toFileUri(normalizedPath);
  return {
    filePath: normalizedPath,
    uploadUri,
  };
};

const buildUploadPath = (profileId: string, recipeId: string, fileName: string): string => {
  return `${profileId}/${recipeId}/${uuidv4()}_${fileName}`;
};

const createUploadError = (bucket: string, path: string, error: any): Error => {
  const message = error?.message ? error.message : 'Unknown error';
  const err = new Error(`Failed to upload to ${bucket}/${path}: ${message}`);
  Object.assign(err, {
    code: error?.code,
    status: error?.status ?? error?.statusCode,
    supabaseError: error,
  });
  return err;
};

const attemptUpload = async (
  bucket: string,
  path: string,
  payload: UploadFormDataFile
): Promise<void> => {
  const fileUri = stripFileScheme(payload.uri);
  const base64Data = await RNFS.readFile(fileUri, 'base64');
  const fileData = decode(base64Data);

  const { error } = await supabase.storage.from(bucket).upload(path, fileData, {
    upsert: true,
    contentType: payload.type ?? 'application/octet-stream',
  });
  if (error) {
    throw createUploadError(bucket, path, error);
  }
};

const isNetworkOrTimeoutError = (error: unknown): boolean => {
  const candidate = error as any;
  const message = typeof candidate?.message === 'string' ? candidate.message.toLowerCase() : '';
  if (candidate?.name === 'AbortError') {
    return true;
  }
  if (/timeout/.test(message)) {
    return true;
  }
  if (/network request failed/.test(message)) {
    return true;
  }
  return false;
};

const isRetryableError = (error: unknown): boolean => {
  const candidate = error as StorageServiceError;
  if (candidate?.code === OFFLINE_ERROR_CODE) {
    return false;
  }
  const status =
    candidate?.status ?? candidate?.supabaseError?.status ?? candidate?.supabaseError?.statusCode;
  if (typeof status === 'number') {
    return status >= 500 || RETRY_STATUS_CODES.has(status);
  }
  return isNetworkOrTimeoutError(error);
};

const uploadWithRetry = async (
  bucket: string,
  path: string,
  payload: UploadFormDataFile
): Promise<void> => {
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt += 1) {
    await ensureOnline();
    try {
      await attemptUpload(bucket, path, payload);
      return;
    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRY_ATTEMPTS - 1;
      if (isLastAttempt || !isRetryableError(error)) {
        throw error;
      }
      const baseDelay = RETRY_BASE_DELAY_MS * 2 ** attempt;
      const jitter = Math.random() * RETRY_JITTER_MS;
      await sleep(baseDelay + jitter);
    }
  }
};

const createSignedUrl = async (bucket: string, path: string): Promise<string> => {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  if (error || !data || !data.signedUrl) {
    const message = error?.message ? error.message : 'Unable to obtain signed URL';
    const err = new Error(`Failed to create signed URL for ${bucket}/${path}: ${message}`);
    Object.assign(err, { code: (error as any)?.code, status: error?.status ?? (error as any)?.statusCode });
    throw err;
  }
  return data.signedUrl;
};

const cleanupOrphan = async (bucket: string, path: string): Promise<void> => {
  try {
    await supabase.storage.from(bucket).remove([path]);
  } catch (error) {
    // best effort cleanup
  }
};

const normalizeStoragePath = (path?: string | null): string | null => {
  if (!path) {
    return null;
  }
  const trimmed = path.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.replace(/^\/+/, '');
};

const isPublicBucket = (bucket: string): boolean => PUBLIC_BUCKETS.has(bucket);

const getBucketPublicUrl = (bucket: string, path?: string | null): string | null => {
  const normalizedPath = normalizeStoragePath(path);
  if (!normalizedPath) {
    return null;
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(normalizedPath);
  return data?.publicUrl ?? null;
};

const getBucketObjectUrl = async (
  bucket: string,
  path?: string | null
): Promise<string | null> => {
  const normalizedPath = normalizeStoragePath(path);
  if (!normalizedPath) {
    return null;
  }
  if (PUBLIC_BUCKETS.has(bucket)) {
    return getBucketPublicUrl(bucket, normalizedPath);
  }
  return await createSignedUrl(bucket, normalizedPath);
};

const requireContext = (profileId: string, recipeId: string): void => {
  if (!profileId) {
    throw new Error('StorageService: Missing profile id');
  }
  if (!recipeId) {
    throw new Error('StorageService: Missing recipe id');
  }
};

const uploadAsset = async (
  bucket: string,
  profileId: string,
  recipeId: string,
  file: RecipeAssetFile,
  fileName: string
): Promise<string> => {
  const maxBytes = bucket === AUDIO_BUCKET ? MAX_AUDIO_SIZE : MAX_IMAGE_SIZE;
  const contentType = resolveContentType(file, fileName);
  const sanitizedFileName = sanitizeFileName(fileName);
  const fallbackExtension = bucket === AUDIO_BUCKET ? getExtensionFromUri(file.uri) : undefined;
  const finalFileName = ensureFileNameWithExtension(sanitizedFileName, contentType, fallbackExtension);
  const uploadPath = buildUploadPath(profileId, recipeId, finalFileName);

  await ensureOnline();
  const prepared = await prepareUploadUri(file.uri);
  let uploaded = false;

  try {
    await enforceFileSizeLimit(prepared.filePath, maxBytes);
    const payload: UploadFormDataFile = {
      uri: prepared.uploadUri,
      name: finalFileName,
      type: contentType ?? 'application/octet-stream',
    };
    await uploadWithRetry(bucket, uploadPath, payload);
    uploaded = true;
    return uploadPath;
  } catch (error) {
    if (uploaded) {
      await cleanupOrphan(bucket, uploadPath);
    }
    throw error;
  } finally {
    if (prepared.cleanup) {
      try {
        await prepared.cleanup();
      } catch (cleanupError) {
        // ignore cleanup failures
      }
    }
  }
};

export const uploadRecipeImage = async (
  profileId: string,
  recipeId: string,
  file: RecipeAssetFile
): Promise<string> => {
  requireContext(profileId, recipeId);
  const fileName = file.name ?? getFileNameFromUri(file.uri);
  return uploadAsset(IMAGE_BUCKET, profileId, recipeId, file, fileName);
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
    const remotePath = await uploadRecipeImage(profileId, recipeId, file);
    results.push(remotePath);
  }
  return results;
};

export const uploadRecipeAudio = async (
  profileId: string,
  recipeId: string,
  file: RecipeAssetFile
): Promise<string> => {
  requireContext(profileId, recipeId);
  const extension = getExtensionFromUri(file.uri);
  const fileName = `${Date.now()}.${extension}`;
  return uploadAsset(AUDIO_BUCKET, profileId, recipeId, file, fileName);
};

export {
  IMAGE_BUCKET,
  AUDIO_BUCKET,
  THUMBNAIL_BUCKET,
  isPublicBucket,
  getBucketPublicUrl,
  getBucketObjectUrl,
};

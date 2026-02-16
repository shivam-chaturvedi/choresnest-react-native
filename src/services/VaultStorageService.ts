import { Buffer } from 'buffer';
import RNFS from 'react-native-fs';
import { supabase } from '../config/supabase';
import { uuidv4 } from '../utils/uuid';

const VAULT_BUCKET = 'vault-documents';

export type VaultDocumentFile = {
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
        case 'pdf':
            return 'application/pdf';
        case 'txt':
            return 'text/plain';
        case 'doc':
        case 'docx':
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case 'xls':
        case 'xlsx':
            return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        default:
            return undefined;
    }
};

const resolveContentType = (file: VaultDocumentFile, fileName: string): string | undefined => {
    if (file.type) {
        return file.type;
    }
    return inferMimeType(fileName);
};

const toUint8ArrayFromBase64 = (base64: string): Uint8Array => {
    const buffer = Buffer.from(base64, 'base64');
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
};

const readLocalFileAsArray = async (uri: string): Promise<Uint8Array> => {
    const isContentUri = uri.startsWith('content://');
    const normalized = uri.startsWith('file://') ? uri.replace(/^file:\/\//i, '') : uri;
    if (!isContentUri) {
        const exists = await RNFS.exists(normalized);
        if (!exists) {
            throw new Error(`VaultStorageService: Local file not found at ${normalized}`);
        }
    }
    const base64 = await RNFS.readFile(normalized, 'base64');
    return toUint8ArrayFromBase64(base64);
};

const ensureArrayBuffer = async (uri: string): Promise<Uint8Array> => {
    try {
        const response = await fetch(uri);
        if (!response.ok) {
            throw new Error(`Failed to load vault asset: ${response.status} ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
    } catch (error) {
        const isLocal = uri.startsWith('file://') || uri.startsWith('/');
        if (!isLocal) {
            throw error;
        }
        console.warn('VaultStorageService: fetch failed, falling back to RNFS read', { uri, error });
        return await readLocalFileAsArray(uri);
    }
};

const buildObjectPath = (profileId: string, documentId: string, fileName: string): string => {
    const uniqueId = uuidv4();
    return `${profileId}/${documentId}/${uniqueId}_${fileName}`;
};

export const VaultStorageService = {
    async upload(profileId: string, documentId: string, file: VaultDocumentFile): Promise<string> {
        if (!profileId || !documentId) {
            throw new Error('VaultStorageService: Missing profileId or documentId for upload');
        }
        if (!file?.uri) {
            throw new Error('VaultStorageService: File URI is required for upload');
        }
        const buffer = await ensureArrayBuffer(file.uri);
        const fileName = sanitizeFileName(file.name ?? getFileNameFromUri(file.uri));
        const objectPath = buildObjectPath(profileId, documentId, fileName);
        const contentType = resolveContentType(file, fileName);
        console.log('VaultStorageService: uploading to bucket', VAULT_BUCKET, objectPath);
        const { error } = await supabase.storage.from(VAULT_BUCKET).upload(objectPath, buffer, {
            upsert: true,
            contentType,
        });
        if (error) {
            console.error('VaultStorageService: upload failed', {
                bucket: VAULT_BUCKET,
                path: objectPath,
                message: error.message ?? error.toString(),
                status: error?.status,
                details: error?.details,
                hint: error?.hint,
                error,
            });
            const uploadError = new Error(`Failed to upload vault document: ${error.message ?? error.toString()}`);
            (uploadError as any).cause = error;
            throw uploadError;
        }
        return objectPath;
    },

    async getSignedUrl(filePath: string, expiresInSeconds: number): Promise<string> {
        if (!filePath) {
            throw new Error('VaultStorageService: filePath is required for signed URL');
        }
        const { data, error } = await supabase.storage.from(VAULT_BUCKET).createSignedUrl(filePath, expiresInSeconds);
        if (error) {
            throw new Error(`Failed to create signed URL for ${filePath}: ${error.message ?? error.toString()}`);
        }
        if (!data?.signedUrl) {
            throw new Error(`VaultStorageService: signed URL missing for ${filePath}`);
        }
        return data.signedUrl;
    },

    async deleteObject(filePath: string): Promise<void> {
        if (!filePath) {
            return;
        }
        const { error } = await supabase.storage.from(VAULT_BUCKET).remove([filePath]);
        if (error) {
            throw new Error(`Failed to delete vault object ${filePath}: ${error.message ?? error.toString()}`);
        }
    },
};

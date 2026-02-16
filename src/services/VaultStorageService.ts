import { supabase } from '../config/supabase';

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

const resolveContentType = (file: VaultDocumentFile, blob: Blob, fileName: string): string | undefined => {
    if (file.type) {
        return file.type;
    }
    if (blob.type) {
        return blob.type;
    }
    return inferMimeType(fileName);
};

const ensureBlob = async (uri: string): Promise<Blob> => {
    const response = await fetch(uri);
    if (!response.ok) {
        throw new Error(`Failed to load vault asset: ${response.status} ${response.statusText}`);
    }
    return await response.blob();
};

const buildObjectPath = (profileId: string, documentId: string, fileName: string): string => {
    const timestamp = Date.now();
    return `${profileId}/${documentId}/${timestamp}_${fileName}`;
};

export const VaultStorageService = {
    async upload(profileId: string, documentId: string, file: VaultDocumentFile): Promise<string> {
        if (!profileId || !documentId) {
            throw new Error('VaultStorageService: Missing profileId or documentId for upload');
        }
        if (!file?.uri) {
            throw new Error('VaultStorageService: File URI is required for upload');
        }
        const blob = await ensureBlob(file.uri);
        const fileName = sanitizeFileName(file.name ?? getFileNameFromUri(file.uri));
        const objectPath = buildObjectPath(profileId, documentId, fileName);
        const contentType = resolveContentType(file, blob, fileName);
        const { error } = await supabase.storage
            .from(VAULT_BUCKET)
            .upload(objectPath, blob, {
                upsert: true,
                contentType,
            });
        if (error) {
            throw new Error(`Failed to upload vault document: ${error.message ?? error.toString()}`);
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

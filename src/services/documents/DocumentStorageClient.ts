import RNFS from 'react-native-fs';
import { VaultStorageService } from '../VaultStorageService';

export type FileSizeDetails = {
    bytes: number;
    kb: string;
    mb: string;
    gb: string;
};

export type DocumentUploadResult = {
    remotePath: string;
    contentType?: string | null;
    fileSize?: number | null;
    checksum?: string | null;
    sizeDetails?: FileSizeDetails | null;
};

const normalizeFsPath = (uri: string): string => {
    if (!uri) {
        return uri;
    }
    if (uri.startsWith('file://')) {
        return uri.replace(/^file:\/\//i, '');
    }
    return uri;
};

const ensureFileUriScheme = (uri: string): string => {
    if (!uri) {
        return uri;
    }
    if (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('file://')) {
        return uri;
    }
    if (uri.startsWith('/')) {
        return `file://${uri}`;
    }
    return uri;
};

const inferContentType = (uri: string): string | null => {
    const cleaned = uri.split('?')[0].split('#')[0];
    const segments = cleaned.split('.');
    if (segments.length < 2) {
        return null;
    }
    const extension = segments.pop()?.toLowerCase();
    if (!extension) {
        return null;
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
            return null;
    }
};

export const DocumentStorageClient = {
    async uploadDocument(profileId: string, documentId: string, localUri: string): Promise<DocumentUploadResult> {
        if (!profileId || !documentId) {
            throw new Error('DocumentStorageClient: profileId and documentId are required for upload');
        }
        if (!localUri) {
            throw new Error('DocumentStorageClient: localUri is required for upload');
        }

        const uploadUri = ensureFileUriScheme(localUri);
        const remotePath = await VaultStorageService.upload(profileId, documentId, { uri: uploadUri });
        let fileSize: number | null = null;
        let checksum: string | null = null;
        try {
            const normalizedPath = normalizeFsPath(uploadUri);
            const stats = await RNFS.stat(normalizedPath);
            fileSize = stats.size ?? null;
        } catch (error) {
            console.warn('DocumentStorageClient: failed to collect file stats', error);
        }

        try {
            const normalizedPath = normalizeFsPath(uploadUri);
            checksum = await RNFS.hash(normalizedPath, 'sha256');
        } catch (error) {
            console.warn('DocumentStorageClient: failed to hash file', error);
        }

        const contentType = inferContentType(localUri);
        const buildSizeDetails = (value: number): FileSizeDetails => {
            const kb = value / 1024;
            const mb = kb / 1024;
            const gb = mb / 1024;
            const format = (n: number) => `${n.toFixed(2)}`;
            return {
                bytes: value,
                kb: `${format(kb)} KB`,
                mb: `${format(mb)} MB`,
                gb: `${format(gb)} GB`,
            };
        };
        const sizeDetails = fileSize !== null ? buildSizeDetails(fileSize) : null;
        return {
            remotePath,
            fileSize,
            checksum,
            contentType,
            sizeDetails,
        };
    },
};

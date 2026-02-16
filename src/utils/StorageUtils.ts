import RNFS from 'react-native-fs';

export const calculateFileSize = async (uri: string): Promise<number> => {
    try {
        const stat = await RNFS.stat(uri);
        return stat.size; // Returns size in bytes
    } catch (error) {
        console.error('Error calculating file size:', error);
        return 0;
    }
};

export const formatStorageSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';

    const kb = bytes / 1024;
    if (kb < 1024) {
        return `${kb.toFixed(2)} KB`;
    }

    const mb = kb / 1024;
    if (mb < 1024) {
        return `${mb.toFixed(2)} MB`;
    }

    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
};

const looksLikeLocalUri = (uri?: string): boolean => {
    if (!uri) {
        return false;
    }
    const lower = uri.toLowerCase();
    return (
        lower.startsWith('file://') ||
        lower.startsWith('content://') ||
        uri.startsWith('/')
    );
};

export const calculateTotalStorage = async (documents: Array<{ uri?: string }>): Promise<number> => {
    let totalBytes = 0;

    for (const doc of documents) {
        if (!looksLikeLocalUri(doc.uri)) {
            continue;
        }
        try {
            const size = await calculateFileSize(doc.uri!);
            totalBytes += size;
        } catch {
            // Already handled by calculateFileSize (which logs), but guard in case
        }
    }

    return totalBytes;
};

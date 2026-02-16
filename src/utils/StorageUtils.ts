import RNFS from 'react-native-fs';

const normalizeLocalPath = (uri: string): string => {
    return uri.replace(/^file:\/\//i, '').trim();
};

export const calculateFileSize = async (uri: string): Promise<number> => {
    try {
        const stat = await RNFS.stat(normalizeLocalPath(uri));
        return stat.size; // Returns size in bytes
    } catch (error) {
        console.error('Error calculating file size:', error);
        return 0;
    }
};

export const formatStorageSize = (bytes: number): string => {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 B';
    }

    const KB = 1024;
    const MB = KB * 1024;
    const GB = MB * 1024;

    if (bytes < KB) {
        return `${bytes} B`;
    }
    if (bytes < MB) {
        return `${(bytes / KB).toFixed(2)} KB`;
    }
    if (bytes < GB) {
        return `${(bytes / MB).toFixed(2)} MB`;
    }
    return `${(bytes / GB).toFixed(2)} GB`;
};

type StorageCalculationResult = {
    totalBytes: number;
    detailMap: Record<string, number>;
};

const buildStorageCalculationResult = async (
    documents: Array<{ id: string; uri?: string; localUri?: string }>
): Promise<StorageCalculationResult> => {
    let totalBytes = 0;
    const detailMap: Record<string, number> = {};

    for (const doc of documents) {
        const candidate = doc.localUri;
        if (!candidate) {
            continue;
        }
        const normalized = normalizeLocalPath(candidate);
        try {
            const exists = await RNFS.exists(normalized);
            if (!exists) {
                continue;
            }
            const stat = await RNFS.stat(normalized);
            const size = stat.size ?? 0;
            detailMap[doc.id] = size;
            totalBytes += size;
        } catch (error) {
            console.warn('StorageUtils: failed to stat local file', normalized, error);
        }
    }

    return { totalBytes, detailMap };
};

export const calculateTotalStorage = async (
    documents: Array<{ id: string; uri?: string; localUri?: string }>
): Promise<number> => {
    const result = await buildStorageCalculationResult(documents);
    return result.totalBytes;
};

export const calculateStorageDetails = async (
    documents: Array<{ id: string; uri?: string; localUri?: string }>
): Promise<StorageCalculationResult> => {
    return await buildStorageCalculationResult(documents);
};

export const calculateDirectorySize = async (dirPath: string): Promise<number> => {
    try {
        const exists = await RNFS.exists(dirPath);
        if (!exists) {
            return 0;
        }
        const entries = await RNFS.readDir(dirPath);
        let total = 0;
        for (const entry of entries) {
            if (entry.isFile()) {
                total += entry.size ?? 0;
            } else if (entry.isDirectory && entry.isDirectory()) {
                total += await calculateDirectorySize(entry.path);
            }
        }
        return total;
    } catch (error) {
        console.warn('StorageUtils: failed to calculate directory size', dirPath, error);
        return 0;
    }
};

export const calculateAppStorageUsage = async (): Promise<number> => {
    const directories = [RNFS.DocumentDirectoryPath, RNFS.CachesDirectoryPath];
    let total = 0;
    for (const dir of directories) {
        total += await calculateDirectorySize(dir);
    }
    return total;
};

import { Q } from '@nozbe/watermelondb';
import { database } from '../database';
import { Recipe } from '../database/models/Recipe';
import RNFS from 'react-native-fs';
import { uploadRecipeAudio, uploadRecipeImage } from './StorageService';

export type RecipeUploadStatus = 'pending_upload' | 'uploading' | 'uploaded' | 'failed';

type RecipeRecord = {
    id: string;
    profileId?: string;
    localImageUris?: string[] | null;
    localAudioUri?: string | null;
    remoteImagePaths?: string[] | null;
    remoteAudioPath?: string | null;
    imageChecksums?: string[] | null;
    audioChecksum?: string | null;
    uploadStatus?: RecipeUploadStatus | null;
    uploadAttempts?: number | null;
    model?: Recipe;
};

type PersistUpdates = {
    uploadStatus?: RecipeUploadStatus | null;
    uploadAttempts?: number | null;
    lastUploadError?: string | null;
    remoteImagePaths?: string[] | null;
    remoteAudioPath?: string | null;
    localImageUris?: string[] | null;
    localAudioUri?: string | null;
    imageChecksums?: string[] | null;
    audioChecksum?: string | null;
};

const DEFAULT_BACKOFF_DELAY_MS = 1000;
const MAX_BACKOFF_DELAY_MS = 60000;
const MAX_UPLOAD_ATTEMPTS = 10;
const MAX_CONCURRENT_UPLOADS = 3;
const PENDING_STATUSES: RecipeUploadStatus[] = ['pending_upload', 'uploading', 'failed'];

const defaultIsOnline = async (): Promise<boolean> => {
    try {
        const NetInfo = require('@react-native-community/netinfo').default;
        const state = await NetInfo.fetch();
        return Boolean(state.isConnected && state.isInternetReachable !== false);
    } catch (error) {
        console.warn('RecipeUploadWorker: failed to determine network state', error);
        return true;
    }
};

const defaultIsGuest = async (): Promise<boolean> => {
    try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const guest = await AsyncStorage.getItem('IS_GUEST');
        return guest === 'true';
    } catch (error) {
        console.warn('RecipeUploadWorker: failed to read guest flag', error);
        return false;
    }
};

const defaultFetchRecipes = async (profileId: string): Promise<RecipeRecord[]> => {
    const query = database
        .get<Recipe>('recipes')
        .query(
            Q.where('profile_id', profileId),
            Q.where('deleted', false),
            Q.where('upload_status', Q.oneOf(PENDING_STATUSES))
        );
    const records = await query.fetch();
    return records.map(record => ({
        id: record.id,
        profileId: record.profileId,
        localImageUris: record.localImageUris,
        localAudioUri: record.localAudioUri,
        remoteImagePaths: record.remoteImagePaths,
        imageChecksums: record.imageChecksums,
        audioChecksum: record.audioChecksum,
        remoteAudioPath: record.remoteAudioPath,
        uploadStatus: record.uploadStatus as RecipeUploadStatus,
        uploadAttempts: record.uploadAttempts,
        model: record,
    }));
};

const sanitizeLocalUris = (uris?: string[] | null): string[] => {
    if (!uris) {
        return [];
    }
    return uris
        .map((uri) => uri?.trim())
        .filter((uri): uri is string => Boolean(uri));
};

const normalizeLocalUri = (value?: string | null): string | undefined => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
};

const defaultPersist = async (record: RecipeRecord, updates: PersistUpdates): Promise<void> => {
    if (!record?.model) {
        return;
    }
    await database.write(async () => {
        await record.model!.update((recipe: Recipe) => {
            if (updates.uploadStatus !== undefined) {
                recipe.uploadStatus = updates.uploadStatus ?? 'pending_upload';
            }
            if (updates.uploadAttempts !== undefined) {
                recipe.uploadAttempts = updates.uploadAttempts ?? 0;
            }
            if (updates.lastUploadError !== undefined) {
                recipe.lastUploadError = updates.lastUploadError ?? undefined;
            }
            if (updates.remoteImagePaths !== undefined) {
                recipe.remoteImagePaths = updates.remoteImagePaths ?? undefined;
            }
            if (updates.remoteAudioPath !== undefined) {
                recipe.remoteAudioPath = updates.remoteAudioPath ?? undefined;
            }
            if (updates.localImageUris !== undefined) {
                recipe.localImageUris = updates.localImageUris ?? [];
            }
            if (updates.localAudioUri !== undefined) {
                recipe.localAudioUri = updates.localAudioUri ?? undefined;
            }
            if (updates.imageChecksums !== undefined) {
                recipe.imageChecksums = updates.imageChecksums ?? [];
            }
            if (updates.audioChecksum !== undefined) {
                recipe.audioChecksum = updates.audioChecksum ?? null;
            }
        });
    });
};

type RecipeUploadWorkerDependencies = {
    fetchRecipes?: (profileId: string) => Promise<RecipeRecord[]>;
    persist?: (record: RecipeRecord, updates: PersistUpdates) => Promise<void>;
    isOnline?: () => Promise<boolean>;
    isGuest?: () => Promise<boolean>;
};

const normalizeFsPath = (uri: string): string => {
    if (uri.startsWith('file://')) {
        return uri.replace(/^file:\/\//i, '');
    }
    return uri;
};

const computeChecksum = async (uri: string): Promise<string> => {
    try {
        const path = normalizeFsPath(uri);
        const exists = await RNFS.exists(path);
        if (!exists) {
            throw new Error(`File does not exist: ${path}`);
        }
        const stats = await RNFS.stat(path);
        const hash = await RNFS.hash(path, 'sha256');
        return `${stats.size}-${hash}`;
    } catch (error: any) {
        const message = error?.message || 'Unknown FS error';
        throw new Error(`Checksum failed: ${message}`);
    }
};

export class RecipeUploadWorker {
    private dependencies: RecipeUploadWorkerDependencies;
    private profileId: string | null = null;
    private running = false;
    private processing = false;
    private uploadLocks = new Set<string>();
    private nextAttemptAt = new Map<string, number>();
    private retryTimer: ReturnType<typeof setTimeout> | null = null;
    private sessionToken = 0;

    constructor(dependencies: RecipeUploadWorkerDependencies = {}) {
        this.dependencies = {
            fetchRecipes: defaultFetchRecipes,
            persist: defaultPersist,
            isOnline: defaultIsOnline,
            isGuest: defaultIsGuest,
            ...dependencies,
        };
    }

    setProfileId(profileId: string | null) {
        this.profileId = profileId;
        this.sessionToken += 1;
        this.resetSessionState();
    }

    start() {
        if (!this.profileId) {
            return;
        }
        if (this.running) {
            this.triggerProcessing(0);
            return;
        }
        this.running = true;
        this.sessionToken += 1;
        this.triggerProcessing(0);
    }

    stop() {
        this.running = false;
        this.sessionToken += 1;
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
        this.resetSessionState();
    }

    isRunning(): boolean {
        return this.running;
    }

    async triggerProcessing(delayMs = 0) {
        if (!this.running) {
            return;
        }
        if (delayMs > 0) {
            if (this.retryTimer) {
                clearTimeout(this.retryTimer);
            }
            this.retryTimer = setTimeout(() => {
                this.retryTimer = null;
                void this.processPendingRecipes();
            }, delayMs);
            return;
        }
        await this.processPendingRecipes();
    }

    private async processPendingRecipes() {
        if (!this.running || this.processing || !this.profileId) {
            return;
        }
        this.processing = true;
        const capturedToken = this.sessionToken;
        try {
            const online = await this.dependencies.isOnline!();
            const guest = await this.dependencies.isGuest!();
            if (!online || guest) {
                this.scheduleRetry(online ? 10000 : 5000);
                return;
            }
            const recipes = await this.dependencies.fetchRecipes!(this.profileId);
            const now = Date.now();
            let nextDueDelay: number | null = null;
            const readyRecipes: RecipeRecord[] = [];
            let processedAnything = false;
            for (const recipe of recipes) {
                if (capturedToken !== this.sessionToken || !this.running) {
                    break;
                }
                if (this.uploadLocks.has(recipe.id)) {
                    continue;
                }
                const waitingUntil = this.nextAttemptAt.get(recipe.id);
                if (waitingUntil && waitingUntil > now) {
                    const delay = waitingUntil - now;
                    nextDueDelay = nextDueDelay === null ? delay : Math.min(nextDueDelay, delay);
                    continue;
                }
                const localImages = sanitizeLocalUris(recipe.localImageUris);
                const localAudio = normalizeLocalUri(recipe.localAudioUri ?? null);
                if (localImages.length === 0 && !localAudio) {
                    await this.markMissingMedia(recipe);
                    processedAnything = true;
                    continue;
                }
                processedAnything = true;
                readyRecipes.push(recipe);
            }
            if (readyRecipes.length > 0) {
                for (let i = 0; i < readyRecipes.length; i += MAX_CONCURRENT_UPLOADS) {
                    if (capturedToken !== this.sessionToken || !this.running) {
                        break;
                    }
                    const batch = readyRecipes.slice(i, i + MAX_CONCURRENT_UPLOADS);
                    await Promise.all(batch.map((recipe) => this.uploadRecipe(recipe, capturedToken)));
                }
            } else if (!processedAnything && nextDueDelay !== null) {
                this.scheduleRetry(nextDueDelay);
            }
        } finally {
            this.processing = false;
        }
    }

    private async markMissingMedia(recipe: RecipeRecord) {
        const attempts = (recipe.uploadAttempts ?? 0) + 1;
        if (recipe.model?.deleted) {
            await this.dependencies.persist!(recipe, {
                uploadStatus: 'uploaded',
                uploadAttempts: 0,
                lastUploadError: null,
            });
            this.uploadLocks.delete(recipe.id);
            return;
        }
        await this.dependencies.persist!(recipe, {
            uploadStatus: 'failed',
            uploadAttempts: attempts,
            lastUploadError: 'RecipeUploadWorker: missing media assets',
        });
    }

    private scheduleRetry(delayMs: number) {
        const clampedDelay = Math.min(Math.max(delayMs, 0), MAX_BACKOFF_DELAY_MS);
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
        }
        this.retryTimer = setTimeout(() => {
            this.retryTimer = null;
            void this.processPendingRecipes();
        }, clampedDelay);
    }

    private resetSessionState() {
        this.uploadLocks.clear();
        this.nextAttemptAt.clear();
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
    }

    private async cleanupLocalFile(uri?: string | null) {
        if (!uri) {
            return;
        }
        try {
            const path = normalizeFsPath(uri);
            const exists = await RNFS.exists(path);
            if (exists) {
                await RNFS.unlink(path);
            }
        } catch (error) {
            console.warn('RecipeUploadWorker: failed to delete local media', uri, error);
        }
    }

    private async uploadRecipe(recipe: RecipeRecord, token: number) {
        if (!this.profileId) {
            return;
        }
        this.uploadLocks.add(recipe.id);
        const attempts = (recipe.uploadAttempts ?? 0) + 1;
        if (attempts > MAX_UPLOAD_ATTEMPTS) {
            await this.dependencies.persist!(recipe, {
                uploadStatus: 'failed',
                uploadAttempts: attempts,
                lastUploadError: 'RecipeUploadWorker: max upload attempts reached',
            });
            this.uploadLocks.delete(recipe.id);
            return;
        }
        if (recipe.model?.deleted) {
            await this.dependencies.persist!(recipe, {
                uploadStatus: 'uploaded',
                uploadAttempts: 0,
                lastUploadError: null,
            });
            this.uploadLocks.delete(recipe.id);
            return;
        }
        const localImages = sanitizeLocalUris(recipe.localImageUris);
        const localAudioUri = normalizeLocalUri(recipe.localAudioUri ?? null);
        if (localImages.length === 0 && !localAudioUri) {
            await this.dependencies.persist!(recipe, {
                uploadStatus: 'uploaded',
                uploadAttempts: 0,
                lastUploadError: null,
            });
            this.uploadLocks.delete(recipe.id);
            return;
        }
        try {
            if (token !== this.sessionToken) {
                return;
            }
            await this.dependencies.persist!(recipe, {
                uploadStatus: 'uploading',
                uploadAttempts: attempts,
                lastUploadError: null,
            });
            let remainingLocalImages = [...localImages];
            const remotePaths = [...(recipe.remoteImagePaths ?? [])];
            const checksums = [...(recipe.imageChecksums ?? [])];
            while (remainingLocalImages.length > 0) {
                if (token !== this.sessionToken || !this.running) {
                    return;
                }
                const localUri = remainingLocalImages[0];
                const checksum = await computeChecksum(localUri);
                let remotePath: string | undefined;
                const matchIndex = checksums.findIndex(
                    (value, index) => value === checksum && Boolean(remotePaths[index])
                );
                if (matchIndex >= 0) {
                    remotePath = remotePaths[matchIndex];
                } else {
                    remotePath = await uploadRecipeImage(recipe.profileId!, recipe.id, {
                        uri: localUri,
                        name: localUri.split('/').pop() ?? recipe.id,
                    });
                    if (!remotePath) {
                        throw new Error('RecipeUploadWorker: missing remote image path after upload');
                    }
                    remotePaths.push(remotePath);
                    checksums.push(checksum);
                }
                const nextLocalImages = remainingLocalImages.slice(1);
                await this.dependencies.persist!(recipe, {
                    remoteImagePaths: remotePaths,
                    imageChecksums: checksums,
                    localImageUris: nextLocalImages,
                });
                await this.cleanupLocalFile(localUri);
                remainingLocalImages = nextLocalImages;
            }
            if (localAudioUri) {
                if (token !== this.sessionToken || !this.running) {
                    return;
                }
                const checksum = await computeChecksum(localAudioUri);
                let remoteAudioPath = recipe.remoteAudioPath;
                if (recipe.audioChecksum !== checksum || !remoteAudioPath) {
                    remoteAudioPath = await uploadRecipeAudio(recipe.profileId!, recipe.id, {
                        uri: localAudioUri,
                        name: localAudioUri.split('/').pop() ?? recipe.id,
                    });
                }
                await this.dependencies.persist!(recipe, {
                    remoteAudioPath: remoteAudioPath ?? undefined,
                    audioChecksum: checksum,
                    localAudioUri: null,
                });
                await this.cleanupLocalFile(localAudioUri);
            }
            if (token !== this.sessionToken) {
                return;
            }
            await this.dependencies.persist!(recipe, {
                uploadStatus: 'uploaded',
                uploadAttempts: 0,
                lastUploadError: null,
                localImageUris: [],
                localAudioUri: null,
            });
            this.nextAttemptAt.delete(recipe.id);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown upload failure';
            console.error('RecipeUploadWorker:', message, error);
            const delay = Math.min(DEFAULT_BACKOFF_DELAY_MS * 2 ** (attempts - 1), MAX_BACKOFF_DELAY_MS);
            this.nextAttemptAt.set(recipe.id, Date.now() + delay);
            await this.dependencies.persist!(recipe, {
                uploadStatus: 'failed',
                uploadAttempts: attempts,
                lastUploadError: `RecipeUploadWorker: ${message}`,
            });
            this.scheduleRetry(delay);
        } finally {
            this.uploadLocks.delete(recipe.id);
        }
    }
}

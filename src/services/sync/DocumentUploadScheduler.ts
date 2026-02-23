import NetInfo from '@react-native-community/netinfo';
import Config from 'react-native-config';
import { DocumentUploadWorker } from '../documents/DocumentUploadWorker';
import { DocumentDownloadWorker } from '../documents/DocumentDownloadWorker';
import { RecipeUploadWorker } from '../RecipeUploadWorker';

const ENABLE_RECIPE_AND_MEALS = Config.ENABLE_RECIPE_AND_MEALS !== 'false';

class DocumentUploadSchedulerService {
    private worker = new DocumentUploadWorker();
    private recipeWorker = new RecipeUploadWorker();
    private downloadWorker = new DocumentDownloadWorker();
    private netInfoUnsubscribe: (() => void) | null = null;
    private currentProfileId: string | null = null;
    private isConnected = true;
    private sessionId = 0;
    private netInfoListenerSession = 0;

    async startForUser(profileId: string | null) {
        if (!profileId) {
            return;
        }
        this.stop();
        this.currentProfileId = profileId;
        this.worker.setProfileId(profileId);
        if (ENABLE_RECIPE_AND_MEALS) {
            this.recipeWorker.setProfileId(profileId);
        }
        this.downloadWorker.setProfileId(profileId);
        await this.ensureNetInfoSubscription();
        this.worker.start();
        if (ENABLE_RECIPE_AND_MEALS) {
            this.recipeWorker.start();
        }
        // Trigger download of any unresolved documents pulled from another device
        void this.downloadWorker.triggerDownloads();
    }

    stop() {
        this.worker.stop();
        if (ENABLE_RECIPE_AND_MEALS) {
            this.recipeWorker.stop();
        }
        this.currentProfileId = null;
        this.downloadWorker.setProfileId(null);
        this.sessionId += 1;
        this.netInfoListenerSession = this.sessionId;
        if (this.netInfoUnsubscribe) {
            this.netInfoUnsubscribe();
            this.netInfoUnsubscribe = null;
        }
    }

    private async ensureNetInfoSubscription() {
        if (this.netInfoUnsubscribe) {
            return;
        }
        try {
            const initialState = await NetInfo.fetch();
            this.isConnected = Boolean(initialState.isConnected && initialState.isInternetReachable !== false);
        } catch (error) {
            console.warn('DocumentUploadScheduler: failed to fetch network state', error);
            this.isConnected = true;
        }

        this.netInfoListenerSession = this.sessionId;

        this.netInfoUnsubscribe = NetInfo.addEventListener(state => {
            if (this.netInfoListenerSession !== this.sessionId) {
                return;
            }
            const connected = Boolean(state.isConnected && state.isInternetReachable !== false);
            if (connected === this.isConnected) {
                return;
            }
            this.isConnected = connected;
            if (!connected) {
                this.worker.stop();
                if (ENABLE_RECIPE_AND_MEALS) {
                    this.recipeWorker.stop();
                }
                return;
            }
            if (this.currentProfileId) {
                this.worker.setProfileId(this.currentProfileId);
                this.worker.start();
                if (ENABLE_RECIPE_AND_MEALS) {
                    this.recipeWorker.setProfileId(this.currentProfileId);
                    this.recipeWorker.start();
                }
                // On reconnect, also try downloading any docs we missed offline
                this.downloadWorker.setProfileId(this.currentProfileId);
                void this.downloadWorker.triggerDownloads();
            }
        });
    }

    async requestUploadNow(profileId?: string) {
        const id = profileId ?? this.currentProfileId;
        if (!id) {
            return;
        }

        this.sessionId += 1;
        this.netInfoListenerSession = this.sessionId;

        this.currentProfileId = id;
        this.worker.setProfileId(id);
        await this.ensureNetInfoSubscription();
        this.worker.start();

        if (ENABLE_RECIPE_AND_MEALS) {
            this.recipeWorker.setProfileId(id);
            this.recipeWorker.start();
        }

        void this.worker.triggerProcessing(0);
        // Also kick off downloads for any docs synced from another device
        this.downloadWorker.setProfileId(id);
        void this.downloadWorker.triggerDownloads();
    }

    async requestRecipeUploadNow(profileId?: string) {
        if (!ENABLE_RECIPE_AND_MEALS) {
            return;
        }
        const id = profileId ?? this.currentProfileId;
        if (!id) {
            return;
        }

        this.sessionId += 1;
        this.netInfoListenerSession = this.sessionId;

        this.currentProfileId = id;
        this.recipeWorker.setProfileId(id);
        await this.ensureNetInfoSubscription();
        this.recipeWorker.start();

        void this.recipeWorker.triggerProcessing(0);
    }
}

export const DocumentUploadScheduler = new DocumentUploadSchedulerService();

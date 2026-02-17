import NetInfo from '@react-native-community/netinfo';
import { DocumentUploadWorker } from '../documents/DocumentUploadWorker';
import { RecipeUploadWorker } from '../RecipeUploadWorker';

class DocumentUploadSchedulerService {
    private worker = new DocumentUploadWorker();
    private recipeWorker = new RecipeUploadWorker();
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
        this.recipeWorker.setProfileId(profileId);
        await this.ensureNetInfoSubscription();
        this.worker.start();
        this.recipeWorker.start();
    }

    stop() {
        this.worker.stop();
        this.recipeWorker.stop();
        this.currentProfileId = null;
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
                this.recipeWorker.stop();
                return;
            }
            if (this.currentProfileId) {
                this.worker.setProfileId(this.currentProfileId);
                this.worker.start();
                this.recipeWorker.setProfileId(this.currentProfileId);
                this.recipeWorker.start();
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

        this.recipeWorker.setProfileId(id);
        this.recipeWorker.start();

        void this.worker.triggerProcessing(0);
    }

    async requestRecipeUploadNow(profileId?: string) {
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

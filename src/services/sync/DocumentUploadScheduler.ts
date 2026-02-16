import NetInfo from '@react-native-community/netinfo';
import { DocumentUploadWorker } from '../documents/DocumentUploadWorker';

class DocumentUploadSchedulerService {
    private worker = new DocumentUploadWorker();
    private netInfoUnsubscribe: (() => void) | null = null;
    private currentProfileId: string | null = null;
    private isConnected = true;

    async startForUser(profileId: string | null) {
        if (!profileId) {
            return;
        }
        this.worker.stop();
        this.currentProfileId = profileId;
        this.worker.setProfileId(profileId);
        await this.ensureNetInfoSubscription();
        this.worker.start();
    }

    stop() {
        this.worker.stop();
        this.currentProfileId = null;
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

        this.netInfoUnsubscribe = NetInfo.addEventListener(state => {
            const connected = Boolean(state.isConnected && state.isInternetReachable !== false);
            if (connected === this.isConnected) {
                return;
            }
            this.isConnected = connected;
            if (!connected) {
                this.worker.stop();
                return;
            }
            if (this.currentProfileId) {
                this.worker.setProfileId(this.currentProfileId);
                this.worker.start();
            }
        });
    }

    async requestUploadNow(profileId?: string) {
        const id = profileId ?? this.currentProfileId;
        if (!id) {
            return;
        }

        this.currentProfileId = id;
        this.worker.setProfileId(id);
        await this.ensureNetInfoSubscription();
        this.worker.start();

        void this.worker.triggerProcessing(0);
    }
}

export const DocumentUploadScheduler = new DocumentUploadSchedulerService();

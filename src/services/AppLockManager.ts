type AppLockSettingsSnapshot = {
    enabled: boolean;
    hasPin: boolean;
};

class AppLockManager {
    private authRequired = true;
    private settings: AppLockSettingsSnapshot = {
        enabled: false,
        hasPin: false,
    };

    /**
     * Called when the JS bundle launches (fresh start / after kill) to force authentication.
     */
    requestFreshAuth() {
        this.authRequired = true;
    }

    /**
     * Mark the current session as authenticated so we stop showing the lock screen.
     */
    markAuthenticated() {
        this.authRequired = false;
    }

    /**
     * Whether authentication is currently required.
     */
    shouldRequireAuth(): boolean {
        return this.settings.enabled && this.authRequired;
    }

    /**
     * Update internal snapshot any time app lock settings change.
     */
    updateSettings(snapshot: AppLockSettingsSnapshot) {
        const prevEnabled = this.settings.enabled;
        this.settings = snapshot;

        if (!snapshot.enabled) {
            this.authRequired = false;
        } else if (snapshot.enabled && !prevEnabled) {
            // Newly enabled → require auth immediately next time.
            this.authRequired = true;
        }
    }
}

export const appLockManager = new AppLockManager();

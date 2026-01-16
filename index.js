/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Global Error Handler to prevent crashes
const defaultGlobalHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (isFatal) {
        console.error('CRITICAL FATAL ERROR:', error);

        // In a real app, we would report to an error tracking service here
        // Sentry.captureException(error);

        // We show a simple alert for fatal errors in dev/prod to inform the user
        // but we avoid calling the default handler to prevent immediate crash
        // if we believe the app can still render the ErrorBoundary or basic UI.

        import('react-native').then(({ Alert }) => {
            Alert.alert(
                "Unexpected Error",
                "The application encountered a critical error. We've attempted to contain it, but you may need to restart the app if it becomes unstable.",
                [{ text: "OK" }]
            );
        }).catch(e => console.error("Failed to show fatal alert:", e));

    } else {
        // Log non-fatal errors for debugging
        console.log('Non-fatal error caught by global handler:', error);
    }

    // We don't call defaultGlobalHandler(error, isFatal) to prevent the "Red Box" or immediate crash in production
});




import notifee from '@notifee/react-native';

// Register background handler
notifee.onBackgroundEvent(async ({ type, detail }) => {
    // This handler creates a background process that keeps the app alive briefly
    // It's required for background actions to work reliably on Android
    console.log('Background Event:', type, detail);
});

AppRegistry.registerComponent(appName, () => App);

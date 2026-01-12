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
        console.error('Fatal Error:', error);
        // In a real app, you might show a graceful error alert here
        // Alert.alert("Unexpected Error", "We encountered an error. Please restart the app.");
        // We swallow the fatal flag (by not calling defaultHandler) to prevent immediate crash,
        // though the app might be unstable.
    } else {
        // console.log('Non-fatal error:', error);
    }
    // Optional: Report to Sentry/Crashlytics here
});


AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerComponent('react_native', () => App); // Fallback for legacy builds requesting old name

/**
 * @format
 */

import { AppRegistry, ErrorUtils } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import notifee from '@notifee/react-native';
import * as Sentry from '@sentry/react-native';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GLOBAL ERROR HANDLERS - Prevent app crashes and red screens
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Global JavaScript Error Handler
 * Catches all unhandled JavaScript errors and prevents red screen crashes
 */
const globalErrorHandler = (error, isFatal) => {
  console.error("GLOBAL ERROR:", error);
  Sentry.captureException(error, {
    tags: {
      fatal: Boolean(isFatal),
    },
  });
};

// Set the global error handler
if (ErrorUtils) {
  ErrorUtils.setGlobalHandler(globalErrorHandler);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Register background handler for notifee
notifee.onBackgroundEvent(async ({ type, detail }) => {
  try {
    // This handler creates a background process that keeps the app alive briefly
    // It's required for background actions to work reliably on Android
    console.log('Background Event:', type, detail);
  } catch (error) {
    console.error('Error in notifee background handler:', error);
  }
});

if (__DEV__) {
  globalThis.RNFBDebug = true;
}

AppRegistry.registerComponent(appName, () => App);

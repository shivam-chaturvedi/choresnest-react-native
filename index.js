/**
 * @format
 */

import { AppRegistry, ErrorUtils } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import notifee from '@notifee/react-native';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GLOBAL ERROR HANDLERS - Prevent app crashes and red screens
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Global JavaScript Error Handler
 * Catches all unhandled JavaScript errors and prevents red screen crashes
 */
const globalErrorHandler = (error, isFatal) => {
    const timestamp = new Date().toISOString();

    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`[GLOBAL ERROR HANDLER] ${timestamp}`);
    console.error(`Fatal: ${isFatal ? 'YES' : 'NO'}`);
    console.error(`Error: ${error?.message || String(error)}`);

    if (error?.stack) {
        console.error(`Stack Trace:\n${error.stack}`);
    }

    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // In production, you might want to send this to a crash reporting service
    // Example: Sentry.captureException(error);

    // Don't crash the app - let ErrorBoundary handle it
    if (!isFatal) {
        // Non-fatal errors are handled gracefully
        return;
    }

    // Even for fatal errors, we try to keep the app alive
    // The ErrorBoundary component will catch and display these errors
};

// Set the global error handler
if (ErrorUtils) {
    ErrorUtils.setGlobalHandler(globalErrorHandler);
}

/**
 * Unhandled Promise Rejection Handler
 * Catches all unhandled promise rejections
 */
const handleUnhandledPromiseRejection = (event) => {
    const timestamp = new Date().toISOString();
    const reason = event?.reason || event;

    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`[UNHANDLED PROMISE REJECTION] ${timestamp}`);
    console.error(`Reason: ${reason?.message || String(reason)}`);

    if (reason?.stack) {
        console.error(`Stack Trace:\n${reason.stack}`);
    }

    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Prevent the default behavior (red screen)
    if (event?.preventDefault) {
        event.preventDefault();
    }

    // In production, send to crash reporting service
    // Example: Sentry.captureException(reason);
};

// Listen for unhandled promise rejections
if (global.HermesInternal || typeof Promise !== 'undefined') {
    // For Hermes engine or modern JS environments
    const originalPromiseRejection = global.onunhandledrejection;

    global.onunhandledrejection = (event) => {
        handleUnhandledPromiseRejection(event);

        // Call original handler if it exists
        if (originalPromiseRejection) {
            originalPromiseRejection(event);
        }
    };
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

AppRegistry.registerComponent(appName, () => App);

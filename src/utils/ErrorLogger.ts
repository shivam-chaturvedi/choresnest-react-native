/**
 * Centralized Error Logging Service
 * 
 * Provides structured error logging with timestamps and context.
 * Can be extended to integrate with crash reporting services like Sentry or Firebase Crashlytics.
 */

interface ErrorContext {
    component?: string;
    action?: string;
    userId?: string;
    additionalData?: Record<string, any>;
}

class ErrorLoggerService {
    /**
     * Log an error with context
     */
    logError(error: Error | unknown, context?: ErrorContext): void {
        const timestamp = new Date().toISOString();
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error(`[ERROR] ${timestamp}`);

        if (context?.component) {
            console.error(`Component: ${context.component}`);
        }

        if (context?.action) {
            console.error(`Action: ${context.action}`);
        }

        console.error(`Message: ${errorMessage}`);

        if (errorStack) {
            console.error(`Stack Trace:\n${errorStack}`);
        }

        if (context?.additionalData) {
            console.error('Additional Data:', JSON.stringify(context.additionalData, null, 2));
        }

        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // TODO: Send to crash reporting service (Sentry, Firebase Crashlytics, etc.)
        // Example: Sentry.captureException(error, { contexts: { custom: context } });
    }

    /**
     * Log a warning
     */
    logWarning(message: string, context?: ErrorContext): void {
        const timestamp = new Date().toISOString();

        console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.warn(`[WARNING] ${timestamp}`);

        if (context?.component) {
            console.warn(`Component: ${context.component}`);
        }

        console.warn(`Message: ${message}`);

        if (context?.additionalData) {
            console.warn('Additional Data:', JSON.stringify(context.additionalData, null, 2));
        }

        console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    /**
     * Log an info message
     */
    logInfo(message: string, context?: ErrorContext): void {
        const timestamp = new Date().toISOString();
        console.log(`[INFO] ${timestamp} - ${message}`, context || '');
    }
}

export const ErrorLogger = new ErrorLoggerService();
export type { ErrorContext };

import { AuthError, PostgrestError } from '@supabase/supabase-js';
import { toastService } from '../services/ToastService';
import { Alert } from 'react-native';

/**
 * Maps Supabase error codes and messages to user-friendly messages
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Auth errors
  invalid_credentials: 'Invalid email or password. Please try again.',
  invalid_grant: 'Invalid email or password. Please try again.',
  user_not_found: 'No account found with this email address.',
  email_not_confirmed: 'Please verify your email address before signing in.',
  user_already_exists:
    'This email is already registered. Please sign in instead.',
  weak_password: 'Password is too weak. Please use at least 8 characters.',
  invalid_email: 'Please enter a valid email address.',
  email_exists: 'This email is already registered. Please sign in instead.',
  signup_disabled:
    'New signups are currently disabled. Please contact support.',
  over_email_send_rate_limit:
    'Too many requests. Please wait a few minutes before trying again.',
  email_provider_disabled:
    'Email authentication is currently unavailable. Please try again later.',
  validation_failed:
    'Sign-in provider is not configured. Please contact support or try email login.',
  provider_disabled:
    'Google sign-in is currently disabled. Please use email login or contact support.',

  // Password reset errors
  same_password: 'New password must be different from your current password.',
  password_reset_required: 'Please reset your password to continue.',

  // Session errors
  session_not_found: 'Your session has expired. Please sign in again.',
  refresh_token_not_found: 'Your session has expired. Please sign in again.',
  invalid_refresh_token: 'Your session has expired. Please sign in again.',

  // Network and server errors
  fetch_error: 'Network error. Please check your internet connection.',
  network_error: 'Network error. Please check your internet connection.',
  timeout: 'Request timed out. Please try again.',
  server_error: 'Server error. Please try again later.',

  // Database errors
  pgrst: 'Database error. Please try again.',
  '23505': 'This record already exists.',
  '23503': 'Cannot delete this record as it is being used elsewhere.',
  '42501': 'You do not have permission to perform this action.',

  // Generic fallbacks
  unknown: 'Something went wrong. Please try again.',
};

/**
 * Context-specific error messages for better user guidance
 */
const CONTEXT_MESSAGES: Record<string, Record<string, string>> = {
  login: {
    default: 'Unable to sign in. Please check your credentials and try again.',
    network:
      'Cannot connect to the server. Please check your internet connection.',
  },
  signup: {
    default: 'Unable to create account. Please try again.',
    network:
      'Cannot connect to the server. Please check your internet connection.',
  },
  logout: {
    default: 'Unable to sign out. Please try again.',
  },
  password_reset: {
    default: 'Unable to send password reset email. Please try again.',
    network:
      'Cannot connect to the server. Please check your internet connection.',
  },
  oauth: {
    default: 'Unable to complete social sign-in. Please try again.',
    network:
      'Cannot connect to the server. Please check your internet connection.',
  },
};

/**
 * Extracts a user-friendly error message from a Supabase error
 */
export function getHumanReadableMessage(error: any, context?: string): string {
  if (!error) return ERROR_MESSAGES.unknown;

  // Check for network errors
  if (
    error.message?.includes('fetch') ||
    error.message?.includes('network') ||
    error.name === 'FetchError'
  ) {
    return context && CONTEXT_MESSAGES[context]?.network
      ? CONTEXT_MESSAGES[context].network
      : ERROR_MESSAGES.network_error;
  }

  // Handle AuthError
  if (error.__isAuthError || error.name === 'AuthApiError' || error.status) {
    const errorCode = error.code || error.error_code || '';
    const errorMessage = error.message?.toLowerCase() || '';

    // Check for specific auth error codes
    if (errorCode in ERROR_MESSAGES) {
      return ERROR_MESSAGES[errorCode];
    }

    // Check for error messages containing known patterns
    if (
      errorMessage.includes('invalid login credentials') ||
      errorMessage.includes('invalid credentials')
    ) {
      return ERROR_MESSAGES.invalid_credentials;
    }
    if (
      errorMessage.includes('user not found') ||
      errorMessage.includes('user_not_found')
    ) {
      return ERROR_MESSAGES.user_not_found;
    }
    if (
      errorMessage.includes('email not confirmed') ||
      errorMessage.includes('email_not_confirmed')
    ) {
      return ERROR_MESSAGES.email_not_confirmed;
    }
    if (
      errorMessage.includes('user already exists') ||
      errorMessage.includes('already registered')
    ) {
      return ERROR_MESSAGES.user_already_exists;
    }
    if (errorMessage.includes('invalid email')) {
      return ERROR_MESSAGES.invalid_email;
    }
    if (
      errorMessage.includes('weak password') ||
      errorMessage.includes('password is too weak')
    ) {
      return ERROR_MESSAGES.weak_password;
    }
    if (errorMessage.includes('rate limit')) {
      return ERROR_MESSAGES.over_email_send_rate_limit;
    }
    if (
      errorMessage.includes('provider is not enabled') ||
      errorMessage.includes('unsupported provider') ||
      errorCode === 'validation_failed'
    ) {
      return 'Google sign-in is disabled in Supabase. Enable Authentication → Providers → Google, then try again.';
    }
    if (errorMessage.includes('session') && errorMessage.includes('expired')) {
      return ERROR_MESSAGES.session_not_found;
    }
  }

  // Handle PostgrestError
  if (error.code && error.code.startsWith('PGRST')) {
    return ERROR_MESSAGES.pgrst;
  }

  // Handle PostgreSQL error codes
  if (error.code && ERROR_MESSAGES[error.code]) {
    return ERROR_MESSAGES[error.code];
  }

  // Context-specific fallback
  if (context && CONTEXT_MESSAGES[context]?.default) {
    return CONTEXT_MESSAGES[context].default;
  }

  // Use error message if it seems user-friendly (short and doesn't contain technical terms)
  const msg = error.message || error.msg || '';
  if (
    msg &&
    msg.length < 100 &&
    !msg.includes('Error:') &&
    !msg.includes('Exception')
  ) {
    return msg;
  }

  // Final fallback
  return ERROR_MESSAGES.unknown;
}

/**
 * Handles a Supabase error by showing a user-friendly toast notification
 * and logging the technical error for debugging
 *
 * @param error - The error object from Supabase
 * @param context - Optional context for more specific error messages (e.g., 'login', 'signup')
 * @param customTitle - Optional custom title for the toast
 */
export function handleSupabaseError(
  error: any,
  context?: string,
  customTitle?: string,
): void {
  // Log the technical error for debugging
  console.error(`Supabase error [${context || 'unknown'}]:`, error);

  // Get user-friendly message
  const message = getHumanReadableMessage(error, context);

  console.log('Attempting to show toast:', {
    type: 'error',
    title: customTitle || 'Error',
    description: message,
  });

  // Show toast notification
  try {
    toastService.showToast({
      type: 'error',
      title: customTitle || 'Error',
      description: message,
      duration: 4000, // Show error toasts a bit longer
    });
    console.log('Toast service called successfully');
  } catch (toastError) {
    console.error('Failed to show toast:', toastError);
    // Fallback: show alert if toast fails
    Alert.alert(customTitle || 'Error', message);
  }
}

/**
 * Wraps an async Supabase operation with automatic error handling
 * Returns true if successful, false if error occurred
 */
export async function withSupabaseErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string,
  customTitle?: string,
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    handleSupabaseError(error, context, customTitle);
    return null;
  }
}

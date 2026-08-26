import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import { supabase, supabaseUrl, supabaseKey } from '../config/supabase';
import { SupabaseService } from '../services/SupabaseService';
import { AppSettingsService } from '../services/AppSettingsService';
import { ProfileBootstrapService } from '../services/ProfileBootstrapService';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { getHumanReadableMessage } from '../utils/SupabaseErrorHandler';
import { ErrorLogger } from '../utils/ErrorLogger';
import { DocumentUploadScheduler } from '../services/sync/DocumentUploadScheduler';
import { getDatabase } from '../database';
import UserRecord from '../database/models/User';
import { Q } from '@nozbe/watermelondb';
import { ProfileService } from '../services/ProfileService';
import {
  loginUser as proxyLoginUser,
  registerUser as proxyRegisterUser,
} from '../services/proxyAuthService';
import * as Sentry from '@sentry/react-native';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  isGuest: boolean;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  isLoading: boolean;
  /**
   * Monotonically-increasing integer. Incremented on every login / logout /
   * guest-login / profile-switch. Pass this into any async bootstrap/sync
   * function and bail out early if it changes mid-flight to avoid acting on
   * stale auth state.
   */
  sessionEpoch: number;
  login: (email: string, pass: string) => Promise<boolean>;
  signup: (
    email: string,
    pass: string,
    name: string,
  ) => Promise<'session' | 'confirm_email' | false>;
  resendConfirmationEmail: (email: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  isPasswordRecoveryFlow: boolean;
  passwordRecoveryAccessToken: string | null;
  completePasswordRecoveryFlow: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

interface AuthProviderProps {
  children: ReactNode;
  onError?: (title: string, message: string) => void;
}

const FALLBACK_OAUTH_SCHEME = 'com.choresnest';
const FALLBACK_OAUTH_HOST = 'auth-callback';
const NATIVE_OAUTH_REDIRECT_URI = `${FALLBACK_OAUTH_SCHEME}://${FALLBACK_OAUTH_HOST}`;

/** Prefer env override, then native deep link (matches Android/iOS intent filters). */
const resolveGoogleOAuthRedirectUri = (): string => {
  const fromEnv = (Config.GOOGLE_OAUTH_REDIRECT_URI || '').trim();
  if (fromEnv) {
    return fromEnv;
  }
  return NATIVE_OAUTH_REDIRECT_URI;
};

const isRecognizedAuthCallbackUrl = (rawUrl?: string | null) => {
  if (!rawUrl) {
    return false;
  }

  try {
    const parsed = new URL(rawUrl);
    const normalizedPath = parsed.pathname.replace(/\/$/, '');
    const normalizedHost = parsed.host.replace(/^www\./, '');

    const isFallbackScheme =
      parsed.protocol === `${FALLBACK_OAUTH_SCHEME}:` &&
      parsed.host === FALLBACK_OAUTH_HOST;

    const isVerifiedLink =
      parsed.protocol === 'https:' &&
      normalizedHost === 'choresnest.com' &&
      (normalizedPath === '/auth/callback' ||
        normalizedPath === '/reset-password' ||
        normalizedPath === '/confirm-email');

    return isFallbackScheme || isVerifiedLink;
  } catch {
    return false;
  }
};

const assertGoogleProviderEnabled = async (): Promise<void> => {
  try {
    const settingsUrl = `${supabaseUrl}/auth/v1/settings`;
    const response = await fetch(settingsUrl, {
      headers: {
        apikey: supabaseKey || '',
        Authorization: `Bearer ${supabaseKey || ''}`,
      },
    });
    if (!response.ok) {
      console.warn(
        'AuthContext: auth settings probe failed',
        response.status,
        supabaseUrl,
      );
      return;
    }
    const settings = await response.json();
    const googleSetting = settings?.external?.google;
    const googleEnabled =
      googleSetting === true ||
      googleSetting === 'true' ||
      googleSetting?.enabled === true;
    console.log('[AuthContext] Google provider status', {
      supabaseUrl,
      googleSetting,
      googleEnabled,
    });
    if (!googleEnabled) {
      throw new Error(
        `Google sign-in is disabled on ${supabaseUrl}. Open that project in Supabase → Authentication → Providers → Google, enable it, and add redirect URLs com.choresnest://auth-callback and https://choresnest.com/auth/callback.`,
      );
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('Google sign-in is disabled')
    ) {
      throw error;
    }
    // Network/settings probe failures should not block OAuth attempt
    console.warn(
      'AuthContext: Could not preflight Google provider settings',
      error,
    );
  }
};

async function proxyLogin(email: string, pass: string) {
  await proxyLoginUser(email, pass);
  return { data: null, error: null };
}

async function proxyRegister(email: string, pass: string) {
  await proxyRegisterUser(email, pass);
  return { data: null, error: null };
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  onError,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const [isPasswordRecoveryFlow, setIsPasswordRecoveryFlow] = useState(false);
  const [passwordRecoveryAccessToken, setPasswordRecoveryAccessToken] =
    useState<string | null>(null);

  // Ref copy so async callbacks can read the latest epoch without closure capture
  const epochRef = useRef(0);
  const authInitCompleteRef = useRef(false);
  const authRedirectInFlightRef = useRef(false);
  const bumpEpoch = () => {
    epochRef.current += 1;
    setSessionEpoch(epochRef.current);
  };
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    const initializeAuth = async () => {
      authInitCompleteRef.current = false;
      const timeoutId = setTimeout(() => {
        if (isLoading) {
          console.warn(
            'AuthContext: initializeAuth timed out after 5s - forcing loading to false',
          );
          authInitCompleteRef.current = true;
          if (!authRedirectInFlightRef.current) {
            setIsLoading(false);
          }
        }
      }, 5000);

      try {
        console.log('AuthContext: Starting auth initialization...');
        const start = Date.now();
        const initialUrl = await Linking.getInitialURL().catch(error => {
          ErrorLogger.logError(error, {
            component: 'AuthContext',
            action: 'initializeAuth.getInitialURL',
          });
          return null;
        });
        const launchedFromAuthRedirect =
          isRecognizedAuthCallbackUrl(initialUrl);

        // Immediately check local cached user to prevent UI blocking
        const cachedUserStr = await AsyncStorage.getItem('AUTH_USER');
        if (cachedUserStr) {
          try {
            const cachedUser = JSON.parse(cachedUserStr);
            setUser(cachedUser);
            Sentry.setUser({
              id: cachedUser.id,
              email: cachedUser.email ?? undefined,
            });
            DocumentUploadScheduler.startForUser(cachedUser.id);
          } catch (e) {
            console.error('AuthContext: Failed to parse cached user', e);
          }
        } else {
          // No AUTH_USER in our cache does not always mean the user is logged-out.
          // On cold starts from a Google/Supabase redirect, the incoming deep link
          // may still be restoring the session. Clearing Supabase storage here races
          // that restore and can bounce the user back to the login screen.
          //
          if (!launchedFromAuthRedirect && !authRedirectInFlightRef.current) {
            // CRITICAL: If a stale/expired Supabase session exists in AsyncStorage,
            // onAuthStateChange registration triggers _recoverAndRefresh internally,
            // making a network token-refresh call that fails with "Network request failed".
            //
            // DO NOT call supabase.auth.signOut() — despite scope:'local', the SDK
            // still makes a network attempt first and blocks for 46+ seconds on failure.
            //
            // Instead: directly delete Supabase's AsyncStorage keys. Zero network. Instant.
            try {
              const allKeys = await AsyncStorage.getAllKeys();
              const supabaseKeys = allKeys.filter(
                k =>
                  k.startsWith('sb-') ||
                  k === 'supabase.auth.token' ||
                  k.includes('-auth-token') ||
                  k.includes('-auth-code-verifier'),
              );
              if (supabaseKeys.length > 0) {
                await AsyncStorage.multiRemove(supabaseKeys);
                console.log(
                  `AuthContext: Cleared ${supabaseKeys.length} stale Supabase session key(s) from AsyncStorage (no network)`,
                );
              }
            } catch (e) {
              // Ignore — storage error does not block auth init
            }
            setUser(null);
            setIsGuest(false);
            DocumentUploadScheduler.stop();
          } else {
            console.log(
              'AuthContext: Deferring stale-session cleanup while auth redirect is being restored.',
            );
          }
        }

        // Check guest mode independently
        const guest = await AsyncStorage.getItem('IS_GUEST');
        if (guest === 'true') {
          setIsGuest(true);
          Sentry.setUser(null);
        }

        // Check Onboarding status globally across all profiles for this device
        let completed =
          await AppSettingsService.hasAnyProfileCompletedOnboarding();
        if (!completed) {
          const asyncComplete = await AsyncStorage.getItem(
            'HAS_COMPLETED_ONBOARDING',
          );
          if (asyncComplete === 'true') completed = true;
        }
        setHasCompletedOnboarding(completed);
        console.log(
          `AuthContext: Auth initialization total time: ${
            Date.now() - start
          }ms`,
        );
      } catch (error) {
        console.error('Failed to initialize auth state:', error);
        setUser(null);
        setIsGuest(false);
        setHasCompletedOnboarding(false);
      } finally {
        clearTimeout(timeoutId);
        authInitCompleteRef.current = true;
        if (!authRedirectInFlightRef.current) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for Supabase auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (
        !session?.user &&
        authRedirectInFlightRef.current &&
        (_event === 'INITIAL_SESSION' || _event === 'SIGNED_OUT')
      ) {
        console.log(
          `[AuthContext] Ignoring transient ${_event} while OAuth redirect is still being processed.`,
        );
        return;
      }

      if (session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name,
        };

        // CRITICAL: switch Watermelon DB profile BEFORE updating React user state.
        // Each profile has its own SQLite file — setting user first caused FamilyContext
        // to query the guest DB with the auth UUID (empty members until hard reload).
        await AsyncStorage.multiRemove(['IS_GUEST', 'GUEST_PROFILE_ID']);
        await AsyncStorage.setItem('AUTH_USER', JSON.stringify(userData));
        await AsyncStorage.setItem('ACTIVE_PROFILE_ID', session.user.id);
        await ProfileService.setActiveProfileId(session.user.id);

        setIsGuest(false);
        setUser(userData);
        Sentry.setUser({
          id: userData.id,
          email: userData.email ?? undefined,
        });
        // Start token auto-refresh only when we have a real authenticated session
        supabase.auth.startAutoRefresh();
        DocumentUploadScheduler.startForUser(session.user.id);
        bumpEpoch();

        // Cache user record locally for guest-mode discovery
        try {
          await getDatabase().write(async () => {
            const usersCol = getDatabase().get<UserRecord>('users');
            const existing = await usersCol
              .query(Q.where('id', session.user.id))
              .fetch();
            if (existing.length > 0) {
              await existing[0].update(u => {
                u.email = userData.email;
                u.name = userData.name || '';
                u.isGuest = false;
                u.version = (u.version ?? 0) + 1;
              });
            } else {
              await usersCol.create(u => {
                (u._raw as any).id = session.user.id;
                u.email = userData.email;
                u.name = userData.name || '';
                u.isGuest = false;
                u.hasCompletedOnboarding = true;
                u.version = 1;
              });
            }
          });
        } catch (e) {
          console.error('AuthContext: Failed to cache user record:', e);
        }

        // Trigger sync + member bootstrap in background — AppNavigator handles INITIAL_SESSION with delay
        if (_event !== 'INITIAL_SESSION') {
          (async () => {
            try {
              ProfileBootstrapService.resetCache();
              await ProfileBootstrapService.bootstrap(session.user.id, {
                force: true,
              });
              const { FamilyService } = await import(
                '../services/FamilyService'
              );
              await FamilyService.cleanupSeededMeMembers(session.user.id);
            } catch (err) {
              console.warn('AuthContext: post-login bootstrap failed', err);
            }
            try {
              const { SyncService } = await import('../services/SyncService');
              if (!SyncService.getSyncStatus()) {
                SyncService.sync().catch(err => {
                  if (!err?.message?.includes('Concurrent synchronization')) {
                    console.error('Background sync failed:', err);
                  }
                });
              }
            } catch (err) {
              console.error('Failed to load SyncService', err);
            }
          })();
        }
      } else {
        // No session — stop background token refresh to prevent spurious network errors
        supabase.auth.stopAutoRefresh();
        setUser(null);
        Sentry.setUser(null);
        AsyncStorage.removeItem('AUTH_USER');
        DocumentUploadScheduler.stop();
      }
    });

    return () => {
      subscription.unsubscribe();
      DocumentUploadScheduler.stop();
    };
  }, []);

  const completePasswordRecoveryFlow = () => {
    setIsPasswordRecoveryFlow(false);
    setPasswordRecoveryAccessToken(null);
  };

  useEffect(() => {
    const setSessionFromFragment = async (fragment: string) => {
      const trimmed = fragment.startsWith('#') ? fragment.slice(1) : fragment;
      if (!trimmed) {
        return;
      }

      const params = new URLSearchParams(trimmed);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const flowType = params.get('type')?.toLowerCase();
      const hasAccessToken = !!accessToken;
      const hasRefreshToken = !!refreshToken;
      const isRecoveryFlow =
        flowType === 'recovery' ||
        (!flowType && hasAccessToken && !hasRefreshToken);
      console.log('[AuthContext] setSessionFromFragment', {
        hasAccessToken,
        hasRefreshToken,
        flowType,
        isRecoveryFlow,
      });
      if (!accessToken) {
        return;
      }

      // Password-recovery deep links coming from Supabase often include only an
      // access_token and no refresh_token. In that case we don't try to create
      // a long-lived Supabase JS session at all; instead we rely on the token
      // directly for the REST password update flow and simply flip the
      // navigator into reset-password mode. This avoids the expected
      // "AuthSessionMissingError" noise in logs.
      if (isRecoveryFlow && hasAccessToken && !hasRefreshToken) {
        setPasswordRecoveryAccessToken(accessToken);
        setIsPasswordRecoveryFlow(true);
        return;
      }

      try {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken ?? '',
        });
        if (error) {
          const isRecoveryOnlyAccess =
            isRecoveryFlow && hasAccessToken && !hasRefreshToken;

          // For password-recovery deep links we don't want to surface a
          // confusing "Google Sign-In Failed" toast – just log and proceed.
          if (!isRecoveryOnlyAccess) {
            const message = getHumanReadableMessage(error, 'oauth');
            onErrorRef.current?.('Google Sign-In Failed', message);
          }
          ErrorLogger.logError(error, {
            component: 'AuthContext',
            action: 'setSessionFromOAuth',
            additionalData: { fragment: trimmed },
          });

          if (isRecoveryOnlyAccess) {
            setPasswordRecoveryAccessToken(accessToken);
            setIsPasswordRecoveryFlow(true);
            return;
          }

          setIsPasswordRecoveryFlow(false);
          return;
        }

        if (isRecoveryFlow && hasAccessToken) {
          setPasswordRecoveryAccessToken(accessToken);
        } else {
          setPasswordRecoveryAccessToken(null);
        }

        setIsPasswordRecoveryFlow(isRecoveryFlow);
        const { data } = await supabase.auth.getUser();
        console.log(
          '[AuthContext] OAuth/password-recovery session restored for',
          {
            userId: data?.user?.id,
            isRecoveryFlow,
          },
        );
      } catch (error) {
        ErrorLogger.logError(error, {
          component: 'AuthContext',
          action: 'setSessionFromOAuth',
          additionalData: { fragment: trimmed },
        });
      }
    };

    const processOAuthCallback = async (rawUrl?: string) => {
      if (!rawUrl) {
        return;
      }

      try {
        const parsed = new URL(rawUrl);
        const normalizedPath = parsed.pathname.replace(/\/$/, '');
        const normalizedHost = parsed.host.replace(/^www\./, '');

        const isFallbackScheme =
          parsed.protocol === `${FALLBACK_OAUTH_SCHEME}:` &&
          parsed.host === FALLBACK_OAUTH_HOST;

        const isVerifiedLink =
          parsed.protocol === 'https:' &&
          normalizedHost === 'choresnest.com' &&
          (normalizedPath === '/auth/callback' ||
            normalizedPath === '/reset-password' ||
            normalizedPath === '/confirm-email');

        console.log('[AuthContext] processOAuthCallback', {
          rawUrl,
          protocol: parsed.protocol,
          host: parsed.host,
          normalizedHost,
          path: parsed.pathname,
          normalizedPath,
          hash: parsed.hash,
          search: parsed.search,
          isFallbackScheme,
          isVerifiedLink,
        });

        if (!isFallbackScheme && !isVerifiedLink) {
          return;
        }

        authRedirectInFlightRef.current = true;
        setIsLoading(true);

        const providerError =
          parsed.searchParams.get('error_description') ??
          parsed.searchParams.get('error');
        if (providerError) {
          const decodedMessage = decodeURIComponent(providerError);
          onErrorRef.current?.('Google Sign-In Failed', decodedMessage);
          return;
        }

        const authCode = parsed.searchParams.get('code');
        if (authCode) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(
            authCode,
          );
          if (error) {
            const message = getHumanReadableMessage(error, 'oauth');
            onErrorRef.current?.('Google Sign-In Failed', message);
            ErrorLogger.logError(error, {
              component: 'AuthContext',
              action: 'exchangeCodeForSession',
              additionalData: { url: rawUrl },
            });
            return;
          }

          setIsPasswordRecoveryFlow(false);
          setPasswordRecoveryAccessToken(null);
          console.log('[AuthContext] OAuth code exchanged successfully', {
            userId: data?.user?.id,
          });
          return;
        }

        const hashFragment = parsed.hash?.slice(1);
        const searchFragment = parsed.search
          ? parsed.search.startsWith('?')
            ? parsed.search.slice(1)
            : parsed.search
          : '';

        if (hashFragment) {
          await setSessionFromFragment(hashFragment);
        } else if (searchFragment) {
          await setSessionFromFragment(searchFragment);
        }
      } catch (error) {
        ErrorLogger.logError(error, {
          component: 'AuthContext',
          action: 'processGoogleOAuthRedirect',
          additionalData: { url: rawUrl },
        });
      } finally {
        authRedirectInFlightRef.current = false;
        if (authInitCompleteRef.current) {
          setIsLoading(false);
        }
      }
    };

    const handleUrlEvent = ({ url }: { url: string }) => {
      void processOAuthCallback(url);
    };

    void Linking.getInitialURL()
      .then(initialUrl => {
        if (initialUrl) {
          void processOAuthCallback(initialUrl);
        }
      })
      .catch(error => {
        ErrorLogger.logError(error, {
          component: 'AuthContext',
          action: 'getInitialURL',
        });
      });

    const subscription = Linking.addEventListener('url', handleUrlEvent);
    return () => {
      subscription.remove();
    };
  }, []);

  const USE_PROXY_AUTH = Config.USE_PROXY_AUTH === 'true';

  const login = async (email: string, pass: string): Promise<boolean> => {
    ProfileBootstrapService.resetCache();
    try {
      // Race against a 10-second timeout so the spinner never hangs indefinitely
      // when the device has no internet access.
      const timeoutPromise = new Promise<{ data: null; error: Error }>(
        resolve =>
          setTimeout(
            () =>
              resolve({
                data: null,
                error: new Error(
                  'Network request timed out. Please check your internet connection and try again.',
                ),
              }),
            10000,
          ),
      );
      const loginPromise = USE_PROXY_AUTH
        ? proxyLogin(email, pass)
        : SupabaseService.signIn(email, pass);
      const { data, error } = await Promise.race([loginPromise, timeoutPromise]);
      if (error) {
        const message = getHumanReadableMessage(error, 'login');
        onError?.('Login Failed', message);
        return false;
      }

      // Switch DB immediately — don't wait for onAuthStateChange ordering
      const sessionUser =
        (data as any)?.session?.user ?? (data as any)?.user ?? null;
      if (sessionUser?.id) {
        await AsyncStorage.multiRemove(['IS_GUEST', 'GUEST_PROFILE_ID']);
        await ProfileService.setActiveProfileId(sessionUser.id);
      }

      // ✅ NON-DESTRUCTIVE: bump epoch so stale async work self-aborts.
      // Do NOT call DataCleanupService.clearDatabase() — it wipes local rows.
      bumpEpoch();
      console.log(
        '[AuthContext] login: success — DB bound to',
        sessionUser?.id,
        'sessionEpoch:',
        epochRef.current,
      );
      return true;
    } catch (error: any) {
      const message = getHumanReadableMessage(error, 'login');
      onError?.('Login Failed', message);
      return false;
    }
  };

  const signup = async (
    email: string,
    pass: string,
    name: string,
  ): Promise<'session' | 'confirm_email' | false> => {
    ProfileBootstrapService.resetCache();
    try {
      if (USE_PROXY_AUTH) {
        const { error } = await proxyRegister(email, pass);
        if (error) {
          const message = getHumanReadableMessage(error, 'signup');
          onError?.('Signup Failed', message);
          return false;
        }
        bumpEpoch();
        return 'session';
      }

      const { data, error } = await SupabaseService.signUp(email, pass, name);
      if (error) {
        const message = getHumanReadableMessage(error, 'signup');
        onError?.('Signup Failed', message);
        return false;
      }

      // Supabase returns an empty identities array when the email is already registered
      const identities = data?.user?.identities;
      if (data?.user && Array.isArray(identities) && identities.length === 0) {
        onError?.(
          'Account Exists',
          'An account with this email already exists. Please sign in or reset your password.',
        );
        return false;
      }

      if (data?.session?.user) {
        await ProfileService.setActiveProfileId(data.session.user.id);
        bumpEpoch();
        console.log(
          '[AuthContext] signup: session created immediately. sessionEpoch:',
          epochRef.current,
        );
        return 'session';
      }

      // Email confirmation required — do not enter the app yet
      const confirmationSentAt = (data?.user as any)?.confirmation_sent_at;
      if (!confirmationSentAt) {
        console.warn(
          '[AuthContext] signup: no confirmation_sent_at on user. Supabase may not have queued an email (check Auth email confirm + SMTP on project rikhklhxcdhxykxxqvsc).',
        );
      }

      bumpEpoch();
      console.log(
        '[AuthContext] signup: awaiting email confirmation for',
        email,
        'confirmation_sent_at=',
        confirmationSentAt,
      );
      return 'confirm_email';
    } catch (error: any) {
      const message = getHumanReadableMessage(error, 'signup');
      onError?.('Signup Failed', message);
      return false;
    }
  };

  const resendConfirmationEmail = async (email: string): Promise<boolean> => {
    try {
      const { error } = await SupabaseService.resendSignupConfirmation(email);
      if (error) {
        const message = getHumanReadableMessage(error, 'signup');
        onError?.('Could Not Resend Email', message);
        return false;
      }
      return true;
    } catch (error: any) {
      const message = getHumanReadableMessage(error, 'signup');
      onError?.('Could Not Resend Email', message);
      return false;
    }
  };

  const signInWithGoogle = async (): Promise<boolean> => {
    try {
      if (!supabaseUrl || !supabaseKey) {
        throw new Error(
          'Supabase is not configured. Check SUPABASE_URL and SUPABASE_ANON_KEY in your .env files, then rebuild the app.',
        );
      }

      await assertGoogleProviderEnabled();

      const redirectTo = resolveGoogleOAuthRedirectUri();
      console.log('[AuthContext] Starting Google OAuth', {
        supabaseUrl,
        redirectTo,
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        throw error;
      }

      const oauthUrl = data?.url;
      if (!oauthUrl) {
        throw new Error('Google OAuth did not return a redirect URL.');
      }

      // Surface provider-disabled responses before opening the browser when possible
      if (
        oauthUrl.includes('error=') ||
        oauthUrl.includes('validation_failed') ||
        oauthUrl.includes('provider%20is%20not%20enabled')
      ) {
        throw new Error(
          'Google sign-in is disabled in Supabase. Enable Authentication → Providers → Google.',
        );
      }

      const canOpen = await Linking.canOpenURL(oauthUrl);
      if (!canOpen) {
        throw new Error('Unable to open the Google sign-in browser.');
      }

      await Linking.openURL(oauthUrl);
      return true;
    } catch (error: any) {
      const message = getHumanReadableMessage(error, 'oauth');
      ErrorLogger.logError(error, {
        component: 'AuthContext',
        action: 'signInWithGoogle',
      });
      onError?.('Google Sign-In Failed', message);
      return false;
    }
  };

  const loginAsGuest = async (): Promise<void> => {
    try {
      console.log('AuthContext: loginAsGuest starting...');
      ProfileBootstrapService.resetCache();

      // Mark guest session first so profile resolution is consistent everywhere
      await AsyncStorage.setItem('IS_GUEST', 'true');
      await AsyncStorage.removeItem('AUTH_USER');

      // ✅ NON-DESTRUCTIVE: set guest profile — no DB wipe.
      await ProfileService.setGuestProfileId();

      setIsGuest(true);
      setUser(null);
      DocumentUploadScheduler.stop();
      setHasCompletedOnboarding(true);
      bumpEpoch();

      console.log(
        'AuthContext: loginAsGuest complete. DB preserved. sessionEpoch:',
        epochRef.current,
      );
    } catch (error) {
      console.error('Guest login failed:', error);
      throw new Error('Failed to continue as guest. Please try again.');
    }
  };

  const logout = async () => {
    try {
      // Immediately clear UI state
      setUser(null);
      setIsGuest(false);
      bumpEpoch();

      // Non-blocking background cleanup
      (async () => {
        try {
          // Stop sync — no DB wipe, no cursor reset
          const { SyncService } = await import('../services/SyncService');
          SyncService.stopPeriodicSync();

          // ✅ NON-DESTRUCTIVE session cleanup: clears in-memory caches +
          // session AsyncStorage keys only. DB rows are PRESERVED.
          const { DataCleanupService } = await import(
            '../services/DataCleanupService'
          );
          await DataCleanupService.clearSessionCaches();
        } catch (err) {
          console.error(
            'AuthContext: Session cleanup error during logout',
            err,
          );
        }

        ProfileBootstrapService.resetCache();
        await ProfileService.resetCache();
        await AsyncStorage.multiRemove(['IS_GUEST', 'GUEST_PROFILE_ID']);
        DocumentUploadScheduler.stop();
        await SupabaseService.signOut();
        console.log(
          '[AuthContext] logout complete. Local DB rows PRESERVED. sessionEpoch:',
          epochRef.current,
        );
      })();
    } catch (error: any) {
      const message = getHumanReadableMessage(error, 'logout');
      onError?.('Logout Failed', message);
    }
  };

  const completeOnboarding = async () => {
    try {
      setHasCompletedOnboarding(true);
      await AsyncStorage.setItem('HAS_COMPLETED_ONBOARDING', 'true');
    } catch (error) {
      console.error('Failed to save onboarding completion:', error);
      // Don't throw — onboarding is complete in memory even if storage fails
    }
  };

  const deleteAccount = async () => {
    setIsLoading(true);
    try {
      ProfileBootstrapService.resetCache();
      await ProfileService.resetCache();

      // ✅ DESTRUCTIVE — intentional. This is the ONLY place that wipes the DB.
      const { DataCleanupService } = await import(
        '../services/DataCleanupService'
      );
      await DataCleanupService.deleteAllData();

      setUser(null);
      setIsGuest(false);
      setHasCompletedOnboarding(false);
      bumpEpoch();

      console.log('Account deleted successfully');
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest,
        isAuthenticated: !!user || isGuest,
        hasCompletedOnboarding,
        isLoading,
        sessionEpoch,
        login,
        signup,
        resendConfirmationEmail,
        signInWithGoogle,
        loginAsGuest,
        logout,
        completeOnboarding,
        deleteAccount,
        isPasswordRecoveryFlow,
        passwordRecoveryAccessToken,
        completePasswordRecoveryFlow,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

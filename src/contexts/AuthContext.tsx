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
import { supabase } from '../config/supabase';
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
  signup: (email: string, pass: string, name: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  isPasswordRecoveryFlow: boolean;
  passwordRecoveryAccessToken: string | null;
  completePasswordRecoveryFlow: () => void;
  pendingInviteSlug: string | null;
  clearPendingInvite: () => void;
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
const GOOGLE_OAUTH_REDIRECT_URI = 'https://choresnest.com/auth/callback';

const resolveFamilyProfileId = async (userId: string): Promise<string> => {
  try {
    const { data: profileData, error: profileError } = await SupabaseService.from('profiles')
      .select('id, owner_id')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.warn('AuthContext: Unexpected error querying profiles table', profileError);
      return userId;
    }

    if (profileData) {
      if (profileData.owner_id && profileData.owner_id !== profileData.id) {
        return profileData.owner_id;
      }
      return profileData.id ?? userId;
    }

    return userId;
  } catch (error) {
    console.error('AuthContext: Unexpected error resolving member profile', error);
    return userId;
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
  const [pendingInviteSlug, setPendingInviteSlug] = useState<string | null>(null);

  // Ref copy so async callbacks can read the latest epoch without closure capture
  const epochRef = useRef(0);
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
      const timeoutId = setTimeout(() => {
        if (isLoading) {
          console.warn(
            'AuthContext: initializeAuth timed out after 5s - forcing loading to false',
          );
          setIsLoading(false);
        }
      }, 5000);

      try {
        console.log('AuthContext: Starting auth initialization...');
        const start = Date.now();

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
          // No AUTH_USER in our cache → user is logged-out.
          //
          // CRITICAL: If a stale/expired Supabase session exists in AsyncStorage,
          // onAuthStateChange registration triggers _recoverAndRefresh internally,
          // making a network token-refresh call that fails with "Network request failed".
          //
          // DO NOT call supabase.auth.signOut() — despite scope:'local', the SDK
          // still makes a network attempt first and blocks for 46+ seconds on failure.
          //
          // Instead: directly delete Supabase's AsyncStorage keys. Zero network. Instant.
          try {
            const supabaseUrl =
              (await AsyncStorage.getItem('__supabase_url__')) || '';
            // Extract project ref from stored URL OR from known keys via getAllKeys
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
            // Ignore — stoarge error does not block auth init
          }
          setUser(null);
          setIsGuest(false);
          DocumentUploadScheduler.stop();
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
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for Supabase auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name,
        };
        setUser(userData);
        Sentry.setUser({
          id: userData.id,
          email: userData.email ?? undefined,
        });
        setIsGuest(false);
        // Start token auto-refresh only when we have a real authenticated session
        supabase.auth.startAutoRefresh();
        AsyncStorage.removeItem('IS_GUEST');
        AsyncStorage.removeItem('GUEST_PROFILE_ID');
        AsyncStorage.setItem('AUTH_USER', JSON.stringify(userData));
        // Bind the new user's profile immediately so AppNavigator doesn't stall
        const defaultProfileId = session.user.id;
        AsyncStorage.setItem('ACTIVE_PROFILE_ID', defaultProfileId);
        void ProfileService.setActiveProfileId(defaultProfileId);
        setTimeout(() => {
          resolveFamilyProfileId(session.user.id)
            .then(resolvedId => {
              if (resolvedId && resolvedId !== defaultProfileId) {
                console.log(
                  `AuthContext: Resolved family profile id ${resolvedId} for user ${session.user.id}`,
                );
                AsyncStorage.setItem('ACTIVE_PROFILE_ID', resolvedId);
                void ProfileService.setActiveProfileId(resolvedId);
              }
            })
            .catch(error => {
              console.error('AuthContext: Failed to resolve family profile id', error);
            });
        }, 5000);
        DocumentUploadScheduler.startForUser(session.user.id);

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

        // Trigger sync in background — AppNavigator handles INITIAL_SESSION with 8s delay
        if (_event !== 'INITIAL_SESSION') {
          (async () => {
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

    const tryHandleInviteLink = (rawUrl?: string) => {
      if (!rawUrl) {
        return false;
      }
      try {
        const parsed = new URL(rawUrl);
        const normalizedHost = parsed.host.replace(/^www\./, '');

        const nativeInviteSlug =
          parsed.protocol === 'com.choresnest:' && parsed.host === 'invite'
            ? parsed.pathname.replace(/^\/+/, '')
            : null;
        const webInviteSlug =
          parsed.protocol === 'https:' &&
          normalizedHost === 'choresnest.com' &&
          parsed.pathname.startsWith('/invite/')
            ? parsed.pathname.replace(/^\/invite\/+/, '')
            : null;
        const inviteSlug = nativeInviteSlug || webInviteSlug;

        if (inviteSlug) {
          setPendingInviteSlug(inviteSlug);
          return true;
        }
      } catch (error) {
        console.warn('AuthContext: failed to parse invite link', error);
      }
      return false;
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
            normalizedPath === '/reset-password');

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

        const providerError =
          parsed.searchParams.get('error_description') ??
          parsed.searchParams.get('error');
        if (providerError) {
          const decodedMessage = decodeURIComponent(providerError);
          onErrorRef.current?.('Google Sign-In Failed', decodedMessage);
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
      }
    };

    const handleUrlEvent = ({ url }: { url: string }) => {
      if (tryHandleInviteLink(url)) {
        return;
      }
      void processOAuthCallback(url);
    };

    void Linking.getInitialURL()
      .then(initialUrl => {
        if (initialUrl) {
          if (!tryHandleInviteLink(initialUrl)) {
            void processOAuthCallback(initialUrl);
          }
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

  const clearPendingInvite = () => {
    setPendingInviteSlug(null);
  };

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
      const { error } = await Promise.race([loginPromise, timeoutPromise]);
      if (error) {
        const message = getHumanReadableMessage(error, 'login');
        onError?.('Login Failed', message);
        return false;
      }

      // ✅ NON-DESTRUCTIVE: bump epoch so stale async work self-aborts.
      // Do NOT call DataCleanupService.clearDatabase() — it wipes local rows.
      // The active profile will be set by onAuthStateChange above.
      bumpEpoch();
      console.log(
        '[AuthContext] login: success — DB preserved. sessionEpoch:',
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
  ): Promise<boolean> => {
    ProfileBootstrapService.resetCache();
    try {
      const signupPromise = USE_PROXY_AUTH
        ? proxyRegister(email, pass)
        : SupabaseService.signUp(email, pass, name);
      const { error } = await signupPromise;
      if (error) {
        const message = getHumanReadableMessage(error, 'signup');
        onError?.('Signup Failed', message);
        return false;
      }

      // ✅ NON-DESTRUCTIVE: bump epoch only.
      bumpEpoch();
      console.log(
        '[AuthContext] signup: success — DB preserved. sessionEpoch:',
        epochRef.current,
      );
      return true;
    } catch (error: any) {
      const message = getHumanReadableMessage(error, 'signup');
      onError?.('Signup Failed', message);
      return false;
    }
  };

  const signInWithGoogle = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: GOOGLE_OAUTH_REDIRECT_URI,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        throw error;
      }

      const oauthUrl = data?.url;
      if (!oauthUrl) {
        throw new Error('Google OAuth did not return a redirect URL.');
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

      // ✅ NON-DESTRUCTIVE: set guest profile — no DB wipe.
      await ProfileService.setGuestProfileId();

      setIsGuest(true);
      setUser(null);
      DocumentUploadScheduler.stop();
      setHasCompletedOnboarding(true);
      bumpEpoch();

      await AsyncStorage.setItem('IS_GUEST', 'true');
      await AsyncStorage.removeItem('AUTH_USER');
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
        signInWithGoogle,
        loginAsGuest,
        logout,
        completeOnboarding,
        deleteAccount,
        isPasswordRecoveryFlow,
        passwordRecoveryAccessToken,
        completePasswordRecoveryFlow,
        pendingInviteSlug,
        clearPendingInvite,
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

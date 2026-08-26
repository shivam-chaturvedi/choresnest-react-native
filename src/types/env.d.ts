declare module 'react-native-config' {
  export interface NativeConfig {
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
    ENABLE_SYNC?: string;
    ENABLE_IN_APP_UPDATES?: string;
    APP_UPDATE_MODE?: string;
    ENABLE_RECIPE_AND_MEALS?: string;
    ENABLE_DEBUG_TOOLS?: string;
    USE_PROXY_AUTH?: string;
    EVENT_SYNC_DELAY_MS?: string;
    SUPABASE_SYNC_PAGE_SIZE?: string;
    SUPABASE_SYNC_MAX_PULL_RECORDS?: string;
    SUPABASE_SYNC_UPSERT_BATCH?: string;
    SUPABASE_SYNC_DELETE_BATCH?: string;
    LOG_SYNC_NETWORK?: string;
    LOG_SYNC_INDEX_HINTS?: string;
    DELETE_ACCOUNT_FUNCTION_URL?: string;
    SUPPORT_EMAIL?: string;
    SENTRY_DSN?: string;
    SENTRY_ENVIRONMENT?: string;
    SENTRY_AUTH_TOKEN?: string;
    GOOGLE_OAUTH_REDIRECT_URI?: string;
    NODE_ENV?: string;
  }

  export const Config: NativeConfig;
  export default Config;
}

declare module '@env' {
  export const SUPABASE_URL: string;
  export const SUPABASE_ANON_KEY: string;
  export const GOOGLE_OAUTH_REDIRECT_URI: string;
}

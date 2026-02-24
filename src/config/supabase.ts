// supabase.ts — AppState is no longer imported since startAutoRefresh is managed by AuthContext
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Config from "react-native-config";

const SUPABASE_URL = Config.SUPABASE_URL;
const SUPABASE_ANON_KEY = Config.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing Supabase environment variables", { SUPABASE_URL, SUPABASE_ANON_KEY });
    // Optionally throw error, but logging checks if Config is loading at all
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
    auth: {
        storage: AsyncStorage,
        // autoRefreshToken is intentionally false: when true, the Supabase client
        // spawns background token-refresh HTTP requests even when there is no
        // active session. On devices with intermittent connectivity (or emulators)
        // this generates repeated "Network request failed" errors in the logs.
        // We call startAutoRefresh() manually via the AppState listener below,
        // which is controlled by AuthContext's onAuthStateChange lifecycle.
        autoRefreshToken: false,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

export const supabaseUrl = SUPABASE_URL;
export const supabaseKey = SUPABASE_ANON_KEY;


// Token auto-refresh lifecycle is managed by AuthContext.onAuthStateChange:
//   - startAutoRefresh() is called when a real authenticated session is established
//   - stopAutoRefresh() is called on logout / when no session exists
// This prevents spurious "Network request failed" errors from background refresh
// attempts when the user is unauthenticated or the device has connectivity issues.

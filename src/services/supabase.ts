/**
 * Supabase client — created only when the environment is configured.
 *
 * With EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY unset, the
 * whole app runs exactly as before on the bundled JSON datasets (the mode
 * every QA pass and the GitHub Pages demo use). Setting both env vars flips
 * every swapped api.ts function to Postgres with no code change.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const siteUrl = process.env.EXPO_PUBLIC_SITE_URL;

const isBrowser = Platform.OS === 'web' && typeof window !== 'undefined';

/** The URL fragment the page was opened with. Email links land here with
 * tokens or an error (#error_code=otp_expired…), and the client below
 * consumes and clears it during start-up — so it is read first. */
export const initialAuthHash: string = isBrowser ? window.location.hash : '';

/** True when that email link came back as expired or already used. */
export const initialAuthLinkFailed: boolean = (() => {
  const params = new URLSearchParams(initialAuthHash.replace(/^#/, ''));
  return Boolean(params.get('error') || params.get('error_code'));
})();

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          // The web build keeps the default (localStorage); phones need a
          // persistent store or every app restart would sign the student out.
          ...(Platform.OS === 'web' ? {} : { storage: AsyncStorage }),
          persistSession: true,
          autoRefreshToken: true,
          // Confirmation and password-reset links always open the web app.
          detectSessionInUrl: Platform.OS === 'web',
        },
      })
    : null;

export const isBackendConfigured = supabase !== null;

/** Public address of this app, where email links send students back to.
 * The deploy sets it explicitly; the browser's own address is the fallback. */
export function appSiteUrl(): string {
  if (siteUrl) return siteUrl.replace(/\/+$/, '');
  if (isBrowser) return `${window.location.origin}${process.env.EXPO_BASE_URL ?? ''}`.replace(/\/+$/, '');
  return '';
}

/** Remove an email link's tokens from the address bar and the browser
 * history once the client has read them. */
export function clearAuthHash(): void {
  if (!isBrowser || !window.location.hash) return;
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
}

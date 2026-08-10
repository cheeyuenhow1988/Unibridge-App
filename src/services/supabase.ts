/**
 * Supabase client — created only when the environment is configured.
 *
 * With EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY unset, the
 * whole app runs exactly as before on the bundled JSON datasets (the mode
 * every QA pass and the GitHub Pages demo use). Setting both env vars flips
 * every swapped api.ts function to Postgres with no code change.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const isBackendConfigured = supabase !== null;

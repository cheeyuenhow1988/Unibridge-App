/**
 * Real email + password accounts for the LIVE app (Supabase Auth).
 *
 * The demo build never calls this file — its account stays on the device.
 * Sign-up sends a confirmation email (custom SMTP on the project); the link
 * opens /auth/callback, a password-reset link opens /auth/reset.
 */
import type { AuthError, User } from '@supabase/supabase-js';
import { fetchServerProfile, syncProfile } from '@/services/api';
import { appSiteUrl, supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';

export type AuthFailure =
  | 'invalid' | 'not_confirmed' | 'exists' | 'rate_limit' | 'network' | 'weak_password' | 'generic';

/** A failure the screens can turn into a translated, human message. */
export class AuthUiError extends Error {
  constructor(public readonly kind: AuthFailure, message: string) {
    super(message);
  }
}

export type AfterSignIn = '/(tabs)/match' | '/onboarding/profile';

function sb() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export const callbackUrl = () => `${appSiteUrl()}/auth/callback`;
export const resetUrl = () => `${appSiteUrl()}/auth/reset`;

function classify(error: AuthError | Error): AuthUiError {
  const code = String((error as AuthError).code ?? '');
  const status = Number((error as AuthError).status ?? 0);
  const msg = error.message ?? '';
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) return new AuthUiError('invalid', msg);
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(msg)) return new AuthUiError('not_confirmed', msg);
  if (code === 'user_already_exists' || code === 'email_exists' || /already (been )?registered/i.test(msg)) {
    return new AuthUiError('exists', msg);
  }
  if (code === 'weak_password') return new AuthUiError('weak_password', msg);
  if (status === 429 || code.startsWith('over_') || /rate limit|only request this after/i.test(msg)) {
    return new AuthUiError('rate_limit', msg);
  }
  if (error.name === 'AuthRetryableFetchError' || /failed to fetch|network/i.test(msg)) return new AuthUiError('network', msg);
  return new AuthUiError('generic', msg);
}

/** 'confirm' = account created, confirmation email sent. 'active' = the
 * project does not require confirmation and the student is signed in. */
export async function signUp(name: string, email: string, password: string): Promise<'confirm' | 'active'> {
  const { data, error } = await sb().auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: callbackUrl() },
  });
  if (error) throw classify(error);
  // An address that already has a confirmed account comes back as a user
  // with no identities — Supabase hides which emails are registered.
  if (data.user && (data.user.identities?.length ?? 0) === 0) throw new AuthUiError('exists', 'already registered');
  return data.session ? 'active' : 'confirm';
}

export async function signIn(email: string, password: string): Promise<User> {
  const { data, error } = await sb().auth.signInWithPassword({ email, password });
  if (error) throw classify(error);
  return data.user;
}

export async function resendConfirmation(email: string): Promise<void> {
  const { error } = await sb().auth.resend({ type: 'signup', email, options: { emailRedirectTo: callbackUrl() } });
  if (error) throw classify(error);
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await sb().auth.resetPasswordForEmail(email, { redirectTo: resetUrl() });
  if (error) throw classify(error);
}

export async function setNewPassword(password: string): Promise<void> {
  const { error } = await sb().auth.updateUser({ password });
  if (error) throw classify(error);
}

/** The signed-in user. Waits for the client to finish reading an email
 * link in the URL first, so it is safe to call on a callback page. */
export async function currentUser(): Promise<User | null> {
  const { data } = await sb().auth.getSession();
  return data.session?.user ?? null;
}

/** After any successful sign-in: mirror the account on this device, then
 * make sure the device and the server hold the same profile. Returns the
 * screen to open next. */
export async function completeSignIn(user: User): Promise<AfterSignIn> {
  const meta = (user.user_metadata ?? {}) as { name?: string };
  useAuthStore.getState().signIn({ name: meta.name ?? '', email: user.email ?? '', provider: 'email', live: true });
  const { profile, onboarded } = useProfileStore.getState();
  if (onboarded && profile) {
    void syncProfile(profile);
    return '/(tabs)/match';
  }
  const server = await fetchServerProfile();
  if (server) {
    useProfileStore.getState().setProfile(server);
    useProfileStore.getState().completeOnboarding();
    return '/(tabs)/match';
  }
  return '/onboarding/profile';
}

/** Ends this device's session. Callers then wipe local data (/reset): a
 * shared phone must not show the next person a minor's profile. */
export async function signOutLive(): Promise<void> {
  try {
    await sb().auth.signOut({ scope: 'local' });
  } catch {
    // Offline: the local wipe that follows still happens.
  }
}

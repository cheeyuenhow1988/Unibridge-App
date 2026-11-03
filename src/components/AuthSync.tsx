import { useEffect } from 'react';
import { syncProfile } from '@/services/api';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';

/**
 * Live build only. Keeps the account shown in the app in step with the
 * Supabase session (restored on launch, refreshed, expired) and pushes
 * profile changes to the student's server rows while signed in.
 * Renders nothing.
 */
export function AuthSync() {
  useEffect(() => {
    if (!supabase) return undefined;
    let signedIn = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // One save at a time: each save rewrites the grade rows.
    let chain: Promise<void> = Promise.resolve();

    const schedulePush = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const { profile, onboarded } = useProfileStore.getState();
        if (!signedIn || !onboarded || !profile) return;
        chain = chain.then(() => syncProfile(profile));
      }, 1200);
    };

    // Supabase forbids awaiting other auth calls inside this callback, so it
    // only updates local state; the delayed push runs outside it.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      signedIn = Boolean(session);
      const { account, signIn, signOut } = useAuthStore.getState();
      if (session?.user) {
        const email = session.user.email ?? '';
        if (!account?.live || account.pending || account.email !== email) {
          const metaName = String((session.user.user_metadata as { name?: string } | undefined)?.name ?? '');
          signIn({ name: account?.email === email && account.name ? account.name : metaName, email, provider: 'email', live: true });
        }
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') schedulePush();
      } else if (event === 'SIGNED_OUT' && account?.live && !account.pending) {
        signOut();
      }
    });

    const unsubscribeProfile = useProfileStore.subscribe((state, prev) => {
      if (state.profile !== prev.profile || state.onboarded !== prev.onboarded) schedulePush();
    });

    return () => {
      data.subscription.unsubscribe();
      unsubscribeProfile();
      clearTimeout(timer);
    };
  }, []);

  return null;
}

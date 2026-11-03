import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AuthProvider = 'google' | 'apple' | 'email';

export interface Account {
  name: string;
  email: string;
  provider: AuthProvider;
  createdAt: string;
  /** A real server account (live app). Absent = prototype account that
   * lives only on this device. */
  live?: boolean;
  /** Live account created but its email link not opened yet. */
  pending?: boolean;
}

interface AuthState {
  account: Account | null;
  signIn: (account: Omit<Account, 'createdAt'>) => void;
  signOut: () => void;
}

/**
 * The account shown in the app. In the demo build it is the whole story
 * (stored only on this device); in the live build it mirrors the Supabase
 * session — services/auth.ts and components/AuthSync.tsx keep the two in step.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      account: null,
      signIn: (account) => set({ account: { ...account, createdAt: new Date().toISOString() } }),
      signOut: () => set({ account: null }),
    }),
    { name: 'ub-auth', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

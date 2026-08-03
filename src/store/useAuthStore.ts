import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AuthProvider = 'google' | 'apple' | 'email';

export interface Account {
  name: string;
  email: string;
  provider: AuthProvider;
  createdAt: string;
}

interface AuthState {
  account: Account | null;
  signIn: (account: Omit<Account, 'createdAt'>) => void;
  signOut: () => void;
}

/**
 * Prototype auth: accounts live only on this device. Real Google/Apple OAuth
 * and server-side accounts arrive with the backend phase.
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

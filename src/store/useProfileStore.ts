import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { StudentProfile } from '@/types/models';

export type ThemePref = 'system' | 'light' | 'dark';

interface ProfileState {
  profile: StudentProfile | null;
  onboarded: boolean;
  themePref: ThemePref;
  hydrated: boolean;
  setProfile: (profile: StudentProfile) => void;
  patchProfile: (patch: Partial<StudentProfile>) => void;
  completeOnboarding: () => void;
  setThemePref: (pref: ThemePref) => void;
  setHydrated: () => void;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      onboarded: false,
      themePref: 'system',
      hydrated: false,
      setProfile: (profile) => set({ profile }),
      patchProfile: (patch) =>
        set((s) => (s.profile ? { profile: { ...s.profile, ...patch } } : s)),
      completeOnboarding: () => set({ onboarded: true }),
      setThemePref: (themePref) => set({ themePref }),
      setHydrated: () => set({ hydrated: true }),
      reset: () => set({ profile: null, onboarded: false }),
    }),
    {
      name: 'ub-profile',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ profile, onboarded, themePref }) => ({ profile, onboarded, themePref }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

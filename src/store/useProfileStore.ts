import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { StudentProfile } from '@/types/models';

export type ThemePref = 'system' | 'light' | 'dark';
export type AppLanguage = 'en' | 'ms' | 'id' | 'vi' | 'zh' | 'zh-TW' | 'th' | 'hi' | 'ja' | 'ko';

interface ProfileState {
  profile: StudentProfile | null;
  onboarded: boolean;
  themePref: ThemePref;
  language: AppLanguage;
  avatarUri: string | null;
  /** Opt-in to travel-buddy matching with verified coursemates. */
  travelBuddyOptIn: boolean;
  /** Appear in other students' Coursemates tab — off = fully invisible. */
  mateVisible: boolean;
  /** Show which course I study on my coursemate card. */
  mateShowCourse: boolean;
  hydrated: boolean;
  setTravelBuddyOptIn: (on: boolean) => void;
  setMateVisible: (on: boolean) => void;
  setMateShowCourse: (on: boolean) => void;
  setAvatar: (uri: string | null) => void;
  setProfile: (profile: StudentProfile) => void;
  patchProfile: (patch: Partial<StudentProfile>) => void;
  completeOnboarding: () => void;
  setThemePref: (pref: ThemePref) => void;
  setLanguage: (language: AppLanguage) => void;
  setHydrated: () => void;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      onboarded: false,
      themePref: 'system',
      language: 'en',
      avatarUri: null,
      travelBuddyOptIn: false,
      mateVisible: true,
      mateShowCourse: true,
      hydrated: false,
      setTravelBuddyOptIn: (travelBuddyOptIn) => set({ travelBuddyOptIn }),
      setMateVisible: (mateVisible) => set({ mateVisible }),
      setMateShowCourse: (mateShowCourse) => set({ mateShowCourse }),
      setAvatar: (avatarUri) => set({ avatarUri }),
      setProfile: (profile) => set({ profile }),
      patchProfile: (patch) =>
        set((s) => (s.profile ? { profile: { ...s.profile, ...patch } } : s)),
      completeOnboarding: () => set({ onboarded: true }),
      setThemePref: (themePref) => set({ themePref }),
      setLanguage: (language) => set({ language }),
      setHydrated: () => set({ hydrated: true }),
      reset: () => set({ profile: null, onboarded: false, travelBuddyOptIn: false, mateVisible: true, mateShowCourse: true }),
    }),
    {
      name: 'ub-profile',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ profile, onboarded, themePref, language, avatarUri, travelBuddyOptIn, mateVisible, mateShowCourse }) => ({ profile, onboarded, themePref, language, avatarUri, travelBuddyOptIn, mateVisible, mateShowCourse }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

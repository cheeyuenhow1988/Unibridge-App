import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const COMPARE_MAX = 4;

interface SavedState {
  savedCourseIds: string[];
  savedScholarshipIds: string[];
  compareIds: string[];
  toggleSaved: (courseId: string) => void;
  toggleScholarship: (id: string) => void;
  toggleCompare: (courseId: string) => void;
  clearCompare: () => void;
  removeFromCompare: (courseId: string) => void;
  setSaved: (ids: string[]) => void;
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export const useSavedStore = create<SavedState>()(
  persist(
    (set) => ({
      savedCourseIds: [],
      savedScholarshipIds: [],
      compareIds: [],
      toggleSaved: (id) => set((s) => ({ savedCourseIds: toggle(s.savedCourseIds, id) })),
      toggleScholarship: (id) => set((s) => ({ savedScholarshipIds: toggle(s.savedScholarshipIds, id) })),
      toggleCompare: (id) =>
        set((s) => {
          if (s.compareIds.includes(id)) return { compareIds: s.compareIds.filter((x) => x !== id) };
          if (s.compareIds.length >= COMPARE_MAX) return s;
          return { compareIds: [...s.compareIds, id] };
        }),
      clearCompare: () => set({ compareIds: [] }),
      removeFromCompare: (id) => set((s) => ({ compareIds: s.compareIds.filter((x) => x !== id) })),
      setSaved: (ids) => set({ savedCourseIds: ids }),
    }),
    { name: 'ub-saved', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

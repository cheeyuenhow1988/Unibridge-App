import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface MailState {
  readIds: string[];
  /** Mails the student answered via the demo reply box (nothing is really sent). */
  repliedIds: string[];
  markRead: (id: string) => void;
  markReplied: (id: string) => void;
  reset: () => void;
}

export const useMailStore = create<MailState>()(
  persist(
    (set) => ({
      readIds: [],
      repliedIds: [],
      markRead: (id) => set((s) => (s.readIds.includes(id) ? s : { readIds: [...s.readIds, id] })),
      markReplied: (id) => set((s) => (s.repliedIds.includes(id) ? s : { repliedIds: [...s.repliedIds, id] })),
      reset: () => set({ readIds: [], repliedIds: [] }),
    }),
    { name: 'ub-mail', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

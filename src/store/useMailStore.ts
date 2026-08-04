import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface MailState {
  readIds: string[];
  markRead: (id: string) => void;
  reset: () => void;
}

export const useMailStore = create<MailState>()(
  persist(
    (set) => ({
      readIds: [],
      markRead: (id) => set((s) => (s.readIds.includes(id) ? s : { readIds: [...s.readIds, id] })),
      reset: () => set({ readIds: [] }),
    }),
    { name: 'ub-mail', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

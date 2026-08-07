import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface LoggedMsg {
  id: string;
  /** ISO timestamp — every question and answer keeps its date & time. */
  at: string;
  mine: boolean;
  text: string;
}

/** Per-student copy of the AI conversation, kept on-device in the prototype
 * (production syncs this to the student's account). Capped so storage never
 * grows unbounded. */
const MAX_MESSAGES = 300;

interface AssistantLogState {
  log: LoggedMsg[];
  append: (msgs: Omit<LoggedMsg, 'at'>[]) => void;
  reset: () => void;
}

export const useAssistantLogStore = create<AssistantLogState>()(
  persist(
    (set) => ({
      log: [],
      append: (msgs) =>
        set((s) => ({
          log: [...s.log, ...msgs.map((m) => ({ ...m, at: new Date().toISOString() }))].slice(-MAX_MESSAGES),
        })),
      reset: () => set({ log: [] }),
    }),
    { name: 'ub-assistant-log', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

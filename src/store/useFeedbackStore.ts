import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface SurveyAnswer {
  score: number;
  tags: string[];
  note?: string;
  at: string;
}

/** Demo survey answers — stored on-device only in the prototype; production
 * swaps this for the analytics/Supabase pipeline (see ANALYTICS.md). */
interface FeedbackState {
  answers: Record<string, SurveyAnswer>;
  dismissed: string[];
  submit: (surveyId: string, answer: Omit<SurveyAnswer, 'at'>) => void;
  dismiss: (surveyId: string) => void;
  reset: () => void;
}

export const useFeedbackStore = create<FeedbackState>()(
  persist(
    (set) => ({
      answers: {},
      dismissed: [],
      submit: (surveyId, answer) =>
        set((s) => ({
          answers: { ...s.answers, [surveyId]: { ...answer, at: new Date().toISOString() } },
        })),
      dismiss: (surveyId) =>
        set((s) => (s.dismissed.includes(surveyId) ? s : { dismissed: [...s.dismissed, surveyId] })),
      reset: () => set({ answers: {}, dismissed: [] }),
    }),
    { name: 'ub-feedback', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

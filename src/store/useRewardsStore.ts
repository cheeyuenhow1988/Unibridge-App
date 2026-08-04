import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface CoinEvent {
  id: string;
  /** i18n key suffix under rewards.rule_* or rewards.item_*. */
  labelId: string;
  delta: number;
  date: string;
}

interface RewardsState {
  coins: number;
  history: CoinEvent[];
  redeemedIds: string[];
  /** ISO date (YYYY-MM-DD) of the last daily check-in. */
  lastCheckIn: string | null;
  streak: number;
  earn: (labelId: string, delta: number) => void;
  redeem: (itemId: string, price: number) => boolean;
  checkIn: () => boolean;
  reset: () => void;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export const useRewardsStore = create<RewardsState>()(
  persist(
    (set, get) => ({
      coins: 0,
      history: [],
      redeemedIds: [],
      lastCheckIn: null,
      streak: 0,
      earn: (labelId, delta) =>
        set((s) => ({
          coins: s.coins + delta,
          history: [
            { id: `evt-${s.history.length + 1}-${labelId}`, labelId, delta, date: todayISO() },
            ...s.history,
          ],
        })),
      redeem: (itemId, price) => {
        const s = get();
        if (s.coins < price || s.redeemedIds.includes(itemId)) return false;
        set({
          coins: s.coins - price,
          redeemedIds: [...s.redeemedIds, itemId],
          history: [
            { id: `evt-${s.history.length + 1}-${itemId}`, labelId: `item_${itemId}`, delta: -price, date: todayISO() },
            ...s.history,
          ],
        });
        return true;
      },
      checkIn: () => {
        const s = get();
        const today = todayISO();
        if (s.lastCheckIn === today) return false;
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const streak = s.lastCheckIn === yesterday ? s.streak + 1 : 1;
        set({
          lastCheckIn: today,
          streak,
          coins: s.coins + 5,
          history: [
            { id: `evt-${s.history.length + 1}-daily`, labelId: 'rule_daily', delta: 5, date: today },
            ...s.history,
          ],
        });
        return true;
      },
      reset: () => set({ coins: 0, history: [], redeemedIds: [], lastCheckIn: null, streak: 0 }),
    }),
    { name: 'ub-rewards', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { recordCoinEarn, recordRedemption } from '@/services/api';

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
  /** Daily check-in: 🪙1/day, +🪙5 bonus each time the streak completes a
   * 30-day month. Returns what was earned, or false if already checked in. */
  checkIn: () => false | 'daily' | 'monthly';
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
      // Local state stays authoritative for the prototype; each event is
      // also mirrored into the backend's append-only ledger when configured.
      earn: (labelId, delta) => {
        set((s) => ({
          coins: s.coins + delta,
          history: [
            { id: `evt-${s.history.length + 1}-${labelId}`, labelId, delta, date: todayISO() },
            ...s.history,
          ],
        }));
        void recordCoinEarn(labelId, delta);
      },
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
        void recordRedemption(itemId, price);
        return true;
      },
      checkIn: () => {
        const s = get();
        const today = todayISO();
        if (s.lastCheckIn === today) return false;
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const streak = s.lastCheckIn === yesterday ? s.streak + 1 : 1;
        const monthly = streak % 30 === 0;
        const events: CoinEvent[] = [
          { id: `evt-${s.history.length + 1}-daily`, labelId: 'rule_daily', delta: 1, date: today },
        ];
        if (monthly) {
          events.unshift({ id: `evt-${s.history.length + 2}-monthly`, labelId: 'rule_monthly', delta: 5, date: today });
        }
        set({
          lastCheckIn: today,
          streak,
          coins: s.coins + 1 + (monthly ? 5 : 0),
          history: [...events, ...s.history],
        });
        void recordCoinEarn('rule_daily', 1);
        if (monthly) void recordCoinEarn('rule_monthly', 5);
        return monthly ? 'monthly' : 'daily';
      },
      reset: () => set({ coins: 0, history: [], redeemedIds: [], lastCheckIn: null, streak: 0 }),
    }),
    { name: 'ub-rewards', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useRewardsStore } from '@/store/useRewardsStore';

export type Plan = 'free' | 'season_pass' | 'vip';
export type PassTerm = 'monthly' | 'lifetime';

/** Mock prices — the student picks 1-month access or pay-once lifetime. */
export const SEASON_PASS_MONTHLY_USD = 19.99;
export const SEASON_PASS_LIFETIME_USD = 69.99;
export const VIP_BUNDLE_PRICE_USD = 199;
export const FREE_COMPARE_LIMIT = 2;
export const PASS_COMPARE_LIMIT = 4;
export const FREE_ACTIVE_APPLICATIONS = 1;
export const PASS_BONUS_COINS = 100;

interface PlanState {
  plan: Plan;
  /** Which Season Pass the student bought (null until purchased). */
  passTerm: PassTerm | null;
  setPlan: (plan: Plan) => void;
  /** Mock purchase: unlocks the pass and grants the bonus coins once. */
  purchase: (term: PassTerm) => void;
  /** Mock VIP purchase: everything in Season Pass plus arrival services. */
  purchaseVip: () => void;
  reset: () => void;
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      plan: 'free',
      passTerm: null,
      setPlan: (plan) => set({ plan }),
      purchase: (term) => {
        if (get().plan !== 'free') return;
        set({ plan: 'season_pass', passTerm: term });
        useRewardsStore.getState().earn('rule_pass_bonus', PASS_BONUS_COINS);
      },
      purchaseVip: () => {
        const from = get().plan;
        if (from === 'vip') return;
        set({ plan: 'vip' });
        if (from === 'free') useRewardsStore.getState().earn('rule_pass_bonus', PASS_BONUS_COINS);
      },
      reset: () => set({ plan: 'free', passTerm: null }),
    }),
    { name: 'ub-plan', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export const usePlan = () => usePlanStore((s) => s.plan);

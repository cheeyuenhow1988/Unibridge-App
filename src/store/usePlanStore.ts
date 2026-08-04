import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useRewardsStore } from '@/store/useRewardsStore';

export type Plan = 'free' | 'season_pass';

/** One-time purchase, no subscription — editable constants. */
export const SEASON_PASS_PRICE_USD = 49.99;
export const VIP_BUNDLE_PRICE_USD = 199;
export const FREE_COMPARE_LIMIT = 2;
export const PASS_COMPARE_LIMIT = 4;
export const FREE_ACTIVE_APPLICATIONS = 1;
export const PASS_BONUS_COINS = 100;

interface PlanState {
  plan: Plan;
  setPlan: (plan: Plan) => void;
  /** Mock purchase: unlocks the pass and grants the bonus coins once. */
  purchase: () => void;
  reset: () => void;
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      plan: 'free',
      setPlan: (plan) => set({ plan }),
      purchase: () => {
        if (get().plan === 'season_pass') return;
        set({ plan: 'season_pass' });
        useRewardsStore.getState().earn('rule_pass_bonus', PASS_BONUS_COINS);
      },
      reset: () => set({ plan: 'free' }),
    }),
    { name: 'ub-plan', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export const usePlan = () => usePlanStore((s) => s.plan);

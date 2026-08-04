import { getDemoSeed } from '@/services/api';
import { useApplicationsStore } from '@/store/useApplicationsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useCommunityStore } from '@/store/useCommunityStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useRewardsStore } from '@/store/useRewardsStore';
import { useSavedStore } from '@/store/useSavedStore';

/**
 * Loads the demo persona (profile, saved courses, 3 in-flight applications,
 * one joined intake group) so reviewers can explore a lived-in app instantly.
 */
export async function loadDemoProfile(): Promise<void> {
  const seed = await getDemoSeed();
  useAuthStore.getState().signIn({ name: seed.profile.name, email: 'aisyah@demo.unibridge.app', provider: 'google' });
  useProfileStore.getState().setProfile(seed.profile);
  useProfileStore.getState().completeOnboarding();
  useSavedStore.getState().setSaved(seed.savedCourseIds);
  useApplicationsStore.getState().seed(seed.applications, seed.notifications);
  useCommunityStore.getState().seed(seed.joinedGroupIds);
  // Coin balance with a believable earning trail for the demo persona.
  const rewards = useRewardsStore.getState();
  if (rewards.coins === 0 && rewards.history.length === 0) {
    rewards.earn('rule_profile', 20);
    rewards.earn('rule_grades', 30);
    rewards.earn('rule_english', 25);
    rewards.earn('rule_document', 10);
    rewards.earn('rule_application', 60);
    rewards.earn('rule_application', 60);
    rewards.earn('rule_application', 60);
    rewards.earn('rule_daily', 5);
  }
}

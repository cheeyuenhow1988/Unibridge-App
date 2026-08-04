import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useApplicationsStore } from '@/store/useApplicationsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useCommunityStore } from '@/store/useCommunityStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useSavedStore } from '@/store/useSavedStore';

/**
 * Factory-reset deep link. Opening /reset wipes every locally stored thing —
 * account, profile, grades, saves, applications, chats, language, theme —
 * then restarts onboarding, so a shared device can try the app as a
 * brand-new student.
 */
export default function ResetScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void (async () => {
      try {
        await AsyncStorage.clear();
      } catch {
        // storage may already be empty — carry on
      }
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // Full reload drops all in-memory state and boots fresh.
        window.location.replace('./onboarding/welcome');
        return;
      }
      useProfileStore.getState().reset();
      useProfileStore.getState().setAvatar(null);
      useAuthStore.getState().signOut();
      useSavedStore.setState({ savedCourseIds: [], savedScholarshipIds: [], compareIds: [] });
      useApplicationsStore.setState({ applications: [], notifications: [] });
      useCommunityStore.setState({ joinedGroupIds: [], localMessages: {}, connections: [], rsvps: [], likedPostIds: [] });
      router.replace('/onboarding/welcome');
    })();
  }, []);

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg }}>
        <ActivityIndicator color={colors.accent} />
        <Text variant="label" tone="secondary">{t('common.resetting')}</Text>
      </View>
    </Screen>
  );
}

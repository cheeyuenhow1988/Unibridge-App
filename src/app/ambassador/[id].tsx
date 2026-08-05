import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '@/services/nav';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Row, SectionHeader } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { FLAGS } from '@/constants/countries';
import { radius, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useTheme } from '@/hooks/useTheme';
import { getAmbassador, getInstitution } from '@/services/api';
import { hapticTap } from '@/services/haptics';
import { useCommunityStore } from '@/store/useCommunityStore';

export default function AmbassadorProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const likedPostIds = useCommunityStore((s) => s.likedPostIds);
  const toggleLike = useCommunityStore((s) => s.toggleLike);
  const state = useAsync(async () => {
    const ambassador = await getAmbassador(id);
    if (!ambassador) throw new Error('not found');
    const institution = await getInstitution(ambassador.institutionId);
    return { ambassador, institution };
  }, [id]);

  if (state.loading) {
    return (
      <Screen edges={['top', 'bottom']}>
        <SkeletonCards count={3} height={140} />
      </Screen>
    );
  }
  if (state.error || !state.data) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ErrorState onRetry={state.retry} />
      </Screen>
    );
  }
  const { ambassador, institution } = state.data;

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <Row style={{ paddingVertical: spacing.md }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => goBack('/community')} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
      </Row>

      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <Image source={{ uri: ambassador.avatar }} style={{ width: 96, height: 96, borderRadius: radius.full, backgroundColor: colors.surfaceAlt }} />
        <Row gap={6}>
          <Text variant="title">{ambassador.name}</Text>
          <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
        </Row>
        <Badge tone="accent" icon="checkmark-circle" label={t('community.verifiedStudent')} />
        <Text variant="caption" tone="faint" center>{t('community.verifiedExplainer')}</Text>
        <Pressable accessibilityRole="button" onPress={() => institution && router.push(`/institution/${institution.id}`)}>
          <Text variant="bodyMedium" tone="accent" center>
            {FLAGS[ambassador.homeCountry]} {institution?.name}
          </Text>
        </Pressable>
        <Text variant="caption" tone="secondary" center>
          {ambassador.courseName} · {t('common.year', { year: ambassador.year })}
        </Text>
        <Text variant="body" tone="secondary" center style={{ marginTop: spacing.sm }}>
          {ambassador.bio}
        </Text>
      </View>

      <SectionHeader title={t('common.posts')} />
      <View style={{ gap: spacing.md }}>
        {ambassador.posts.map((post) => (
          <Card key={post.id} padded={false}>
            <Image source={{ uri: post.image }} style={{ width: '100%', height: 190 }} contentFit="cover" transition={200} />
            <View style={{ padding: spacing.lg, gap: spacing.xs }}>
              <Text variant="body">{post.text}</Text>
              <Row style={{ justifyContent: 'space-between' }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: likedPostIds.includes(post.id) }}
                  hitSlop={8}
                  onPress={() => {
                    hapticTap();
                    toggleLike(post.id);
                  }}
                  style={{ minHeight: 32, justifyContent: 'center' }}
                >
                  <Row gap={5}>
                    <Ionicons
                      name={likedPostIds.includes(post.id) ? 'heart' : 'heart-outline'}
                      size={16}
                      color={likedPostIds.includes(post.id) ? colors.danger : colors.inkFaint}
                    />
                    <Text variant="caption" tone="faint">
                      {t('common.likes', { count: post.likes + (likedPostIds.includes(post.id) ? 1 : 0) })}
                    </Text>
                  </Row>
                </Pressable>
                <Text variant="caption" tone="faint">{post.date}</Text>
              </Row>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useMatchData } from '@/hooks/useMatchData';
import { useTheme } from '@/hooks/useTheme';
import { useApplicationsStore } from '@/store/useApplicationsStore';
import { useSavedStore } from '@/store/useSavedStore';
import { APPLICATION_TIMELINE, type ApplicationStatus } from '@/types/models';

const STATUS_TONE: Record<ApplicationStatus, 'neutral' | 'pathway' | 'borderline' | 'eligible' | 'verified' | 'accent'> = {
  submitted: 'neutral',
  under_review: 'pathway',
  conditional_offer: 'borderline',
  offer: 'accent',
  accepted: 'eligible',
  coe_issued: 'verified',
};

export default function ApplicationsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { matchData, loading, error, retry } = useMatchData();
  const applications = useApplicationsStore((s) => s.applications);
  const notifications = useApplicationsStore((s) => s.notifications);
  const dismissNotification = useApplicationsStore((s) => s.dismissNotification);
  const savedScholarshipIds = useSavedStore((s) => s.savedScholarshipIds);

  if (loading) {
    return (
      <Screen>
        <SkeletonCards count={4} height={110} />
      </Screen>
    );
  }
  if (error || !matchData) {
    return (
      <Screen>
        <ErrorState onRetry={retry} />
      </Screen>
    );
  }

  const offers = applications.filter((a) => a.status === 'offer' || a.status === 'conditional_offer');
  const unread = notifications.filter((n) => !n.read).slice(0, 2);

  const courseName = (courseId: string) => matchData.resultByCourseId.get(courseId)?.course.name ?? courseId;
  const instName = (courseId: string) => matchData.resultByCourseId.get(courseId)?.institution.name ?? '';

  return (
    <Screen padded={false}>
      <FlatList
        data={applications}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.lg }}>
            <Text variant="display">{t('applications.title')}</Text>

            {unread.map((n) => (
              <Card key={n.id} tone="accent" style={{ gap: 4 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row gap={spacing.sm} style={{ flex: 1 }}>
                    <Ionicons name="notifications" size={16} color={colors.accent} />
                    <Text variant="label" style={{ flex: 1 }} numberOfLines={2}>
                      {t('applications.notifTitle', {
                        course: courseName(
                          applications.find((a) => a.id === n.applicationId)?.courseId ?? '',
                        ),
                        status: t(`status.${n.status}`),
                      })}
                    </Text>
                  </Row>
                  <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => dismissNotification(n.id)} hitSlop={10}>
                    <Ionicons name="close" size={16} color={colors.inkSecondary} />
                  </Pressable>
                </Row>
                <Text variant="caption" tone="faint">{n.date}</Text>
              </Card>
            ))}

            {offers.length >= 1 ? (
              <Button
                label={t('applications.viewOffers', { count: offers.length })}
                icon="gift-outline"
                variant="secondary"
                onPress={() => router.push('/offers')}
              />
            ) : null}

            <Row gap={spacing.md}>
              <Card style={{ flex: 1, gap: 4 }} onPress={() => router.push('/vault')}>
                <Ionicons name="folder-open-outline" size={20} color={colors.accent} />
                <Text variant="label">{t('profile.documentVault')}</Text>
              </Card>
              <Card style={{ flex: 1, gap: 4 }} onPress={() => router.push('/(tabs)/explore')}>
                <Ionicons name="ribbon-outline" size={20} color={colors.accent} />
                <Text variant="label">{t('applications.scholarshipShortlist')}</Text>
                <Text variant="caption" tone="faint">{savedScholarshipIds.length}</Text>
              </Card>
            </Row>
          </View>
        }
        renderItem={({ item }) => {
          const idx = APPLICATION_TIMELINE.indexOf(item.status);
          return (
            <Card onPress={() => router.push(`/application/${item.id}`)} style={{ gap: spacing.sm }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text variant="caption" tone="secondary" style={{ flex: 1 }} numberOfLines={1}>
                  {instName(item.courseId)}
                </Text>
                <Badge tone={STATUS_TONE[item.status]} label={t(`status.${item.status}`)} />
              </Row>
              <Text variant="sub" numberOfLines={2}>{courseName(item.courseId)}</Text>
              <Row gap={5}>
                {APPLICATION_TIMELINE.map((s, i) => (
                  <View
                    key={s}
                    style={{
                      flex: 1, height: 4, borderRadius: radius.full,
                      backgroundColor: i <= idx ? colors.accent : colors.surfaceAlt,
                    }}
                  />
                ))}
              </Row>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text variant="caption" tone="faint">{t('applications.appliedOn', { date: item.createdAt })}</Text>
                <Text variant="caption" tone="faint">{t('applications.updated', { date: item.updatedAt })}</Text>
              </Row>
            </Card>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="documents-outline"
            title={t('applications.empty')}
            body={t('applications.emptyBody')}
            ctaLabel={t('applications.emptyCta')}
            onCta={() => router.push('/(tabs)/match')}
          />
        }
      />
    </Screen>
  );
}

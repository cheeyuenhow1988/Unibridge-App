import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { DepositModal } from '@/components/applications/DepositModal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Row } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { FLAGS } from '@/constants/countries';
import { radius, spacing } from '@/constants/theme';
import { useMatchData } from '@/hooks/useMatchData';
import { useTheme } from '@/hooks/useTheme';
import { costBreakdown } from '@/services/costs';
import { convert, formatMoney, homeCurrencyFor } from '@/services/currency';
import { useApplicationsStore } from '@/store/useApplicationsStore';

export default function OffersScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { matchData, profile, loading, error, retry } = useMatchData();
  const applications = useApplicationsStore((s) => s.applications);
  const acceptOffer = useApplicationsStore((s) => s.acceptOffer);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  if (loading) {
    return (
      <Screen edges={['top', 'bottom']}>
        <SkeletonCards count={3} height={200} />
      </Screen>
    );
  }
  if (error || !matchData || !profile) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ErrorState onRetry={retry} />
      </Screen>
    );
  }

  const home = homeCurrencyFor(profile.homeCountry);
  const offers = applications
    .filter((a) => ['offer', 'conditional_offer', 'accepted', 'coe_issued'].includes(a.status))
    .map((a) => {
      const result = matchData.resultByCourseId.get(a.courseId);
      const col = result ? matchData.colByCity.get(result.course.campusCity) : undefined;
      return result && col ? { app: a, result, costs: costBreakdown(result.course, col) } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  const accepting = offers.find((o) => o.app.id === acceptingId);

  return (
    <Screen padded={false} edges={['top', 'bottom']}>
      <Row style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text variant="heading">{t('applications.offersTitle')}</Text>
        <View style={{ width: 24 }} />
      </Row>

      {offers.length === 0 ? (
        <EmptyState icon="gift-outline" title={t('applications.offersEmpty')} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
          {offers.map(({ app, result, costs }) => {
            const accepted = app.status === 'accepted' || app.status === 'coe_issued';
            return (
              <View
                key={app.id}
                style={{
                  width: 260,
                  borderRadius: radius.lg,
                  borderWidth: 1.5,
                  borderColor: accepted ? colors.eligible : colors.border,
                  backgroundColor: colors.surface,
                  padding: spacing.lg,
                  gap: spacing.md,
                }}
              >
                <Badge
                  tone={accepted ? 'eligible' : app.status === 'offer' ? 'accent' : 'borderline'}
                  label={t(`status.${app.status}`)}
                />
                <View style={{ gap: 2 }}>
                  <Text variant="caption" tone="secondary" numberOfLines={1}>
                    {FLAGS[result.course.country]} {result.institution.name}
                  </Text>
                  <Text variant="sub" numberOfLines={3}>{result.course.name}</Text>
                  <Text variant="caption" tone="faint">{result.course.campusCity}</Text>
                </View>
                <View style={{ gap: 2 }}>
                  <Text variant="caption" tone="secondary">{t('compare.tuitionYear')}</Text>
                  <Text variant="bodyMedium">{formatMoney(costs.tuitionPerYear, costs.currency)}</Text>
                  <Text variant="caption" tone="faint">
                    ≈ {formatMoney(convert(costs.tuitionPerYear, costs.currency, home), home)}
                  </Text>
                </View>
                <View style={{ gap: 2 }}>
                  <Text variant="caption" tone="secondary">{t('compare.trueTotal')}</Text>
                  <Text variant="heading" tone="accent">
                    {formatMoney(convert(costs.trueTotal, costs.currency, home), home)}
                  </Text>
                </View>
                <View style={{ flex: 1 }} />
                {accepted ? (
                  <Button
                    label={t('applications.predeparture')}
                    variant="secondary"
                    icon="airplane-outline"
                    onPress={() => router.push(`/predeparture/${app.id}`)}
                  />
                ) : (
                  <Button label={t('applications.acceptOffer')} onPress={() => setAcceptingId(app.id)} />
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      <DepositModal
        visible={!!accepting}
        course={accepting?.result.course ?? null}
        institution={accepting?.result.institution ?? null}
        onClose={() => setAcceptingId(null)}
        onConfirm={() => {
          if (acceptingId) acceptOffer(acceptingId);
          setAcceptingId(null);
        }}
      />
    </Screen>
  );
}

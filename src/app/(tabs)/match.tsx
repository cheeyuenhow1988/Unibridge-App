import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, View } from 'react-native';
import { DEFAULT_FILTERS, FiltersModal, type MatchFilters } from '@/components/match/FiltersModal';
import { ResultCard } from '@/components/match/ResultCard';
import { StrengthCard } from '@/components/match/StrengthCard';
import { Button } from '@/components/ui/Button';
import { Row } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { Skeleton, SkeletonCards } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useMatchData } from '@/hooks/useMatchData';
import { useTheme } from '@/hooks/useTheme';
import { homeCurrencyFor } from '@/services/currency';
import { trueAnnualIn } from '@/services/costs';
import { useSavedStore } from '@/store/useSavedStore';
import type { MatchResult, MatchStatus } from '@/types/models';

const BUCKETS: { key: MatchStatus; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'eligible', icon: 'checkmark-circle' },
  { key: 'borderline', icon: 'alert-circle' },
  { key: 'pathway', icon: 'trending-up' },
];

export default function MatchScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { matchData, profile, loading, error, retry } = useMatchData();
  const compareIds = useSavedStore((s) => s.compareIds);
  const [bucket, setBucket] = useState<MatchStatus>('eligible');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<MatchFilters>(DEFAULT_FILTERS);

  const homeCurrency = profile ? homeCurrencyFor(profile.homeCountry) : 'USD';
  const homeCountryLabel = profile ? t(`countries.${profile.homeCountry}`) : '';

  const filtered = useMemo(() => {
    if (!matchData) return [];
    return matchData.results.filter((r) => {
      const { course } = r;
      if (filters.country && course.country !== filters.country) return false;
      if (filters.field && course.field !== filters.field) return false;
      if (filters.duration === 'short' && course.durationYears > 2) return false;
      if (filters.duration === 'medium' && (course.durationYears < 3 || course.durationYears > 4)) return false;
      if (filters.duration === 'long' && course.durationYears < 5) return false;
      if (filters.budget) {
        const col = matchData.colByCity.get(course.campusCity);
        if (col && trueAnnualIn(course, col, homeCurrency) > filters.budget) return false;
      }
      return true;
    });
  }, [matchData, filters, homeCurrency]);

  const byBucket = useMemo(() => {
    const map: Record<MatchStatus, MatchResult[]> = { eligible: [], borderline: [], pathway: [] };
    for (const r of filtered) map[r.status].push(r);
    return map;
  }, [filtered]);

  const budgetPresets = useMemo(() => {
    if (!matchData) return [];
    const costs = matchData.results
      .map((r) => {
        const col = matchData.colByCity.get(r.course.campusCity);
        return col ? trueAnnualIn(r.course, col, homeCurrency) : null;
      })
      .filter((v): v is number => v !== null)
      .sort((a, b) => a - b);
    if (costs.length === 0) return [];
    const nice = (v: number) => {
      const mag = 10 ** (String(Math.round(v)).length - 2);
      return Math.round(v / mag) * mag;
    };
    return [...new Set([0.25, 0.5, 0.75].map((q) => nice(costs[Math.floor(costs.length * q)]!)))];
  }, [matchData, homeCurrency]);

  const activeFilterCount =
    (filters.country ? 1 : 0) + (filters.field ? 1 : 0) + (filters.duration !== 'any' ? 1 : 0) + (filters.budget ? 1 : 0);

  if (loading) {
    return (
      <Screen>
        <View style={{ paddingTop: spacing.xl, gap: spacing.lg }}>
          <Skeleton width="60%" height={30} />
          <Skeleton height={110} style={{ borderRadius: radius.lg }} />
          <Row gap={spacing.sm}>
            {[0, 1, 2].map((i) => <Skeleton key={i} height={82} style={{ flex: 1, borderRadius: radius.lg }} />)}
          </Row>
          <SkeletonCards count={3} height={170} />
        </View>
      </Screen>
    );
  }
  if (error || !matchData || !profile) {
    return (
      <Screen>
        <ErrorState onRetry={retry} />
      </Screen>
    );
  }

  const list = byBucket[bucket];

  return (
    <Screen padded={false}>
      <FlatList
        data={list}
        keyExtractor={(r) => r.course.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.lg }}>
            <View style={{ gap: 2 }}>
              <Text variant="display">{t('match.greeting', { name: profile.name.split(' ')[0] })}</Text>
              <Text variant="body" tone="secondary">
                {t('match.subtitle', {
                  count: filtered.length,
                  system: profile.qualification.toUpperCase(),
                })}
              </Text>
            </View>

            <StrengthCard profile={profile} results={matchData.results} />

            <Row gap={spacing.sm}>
              {BUCKETS.map(({ key, icon }) => {
                const selected = bucket === key;
                const color = { eligible: colors.eligible, borderline: colors.borderline, pathway: colors.pathway }[key];
                const soft = { eligible: colors.eligibleSoft, borderline: colors.borderlineSoft, pathway: colors.pathwaySoft }[key];
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    onPress={() => setBucket(key)}
                    style={{
                      flex: 1,
                      borderRadius: radius.lg,
                      backgroundColor: selected ? soft : colors.surface,
                      borderWidth: 1.5,
                      borderColor: selected ? color : colors.border,
                      paddingVertical: spacing.md,
                      alignItems: 'center',
                      gap: 3,
                      minHeight: 84,
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={icon} size={17} color={color} />
                    <Text variant="title" color={color} style={{ fontSize: 24, lineHeight: 28 }}>
                      {byBucket[key].length}
                    </Text>
                    <Text variant="micro" tone={selected ? 'primary' : 'faint'}>
                      {t(`match.${key}`).toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </Row>

            <Row style={{ justifyContent: 'space-between' }}>
              <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
                {t(`match.${bucket}Desc`)}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setFiltersOpen(true)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: activeFilterCount ? colors.accent : colors.surface,
                  borderWidth: 1,
                  borderColor: activeFilterCount ? colors.accent : colors.border,
                  borderRadius: radius.full,
                  paddingHorizontal: spacing.lg,
                  minHeight: 40,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Ionicons name="options-outline" size={16} color={activeFilterCount ? colors.onAccent : colors.ink} />
                <Text variant="caption" color={activeFilterCount ? colors.onAccent : colors.ink}>
                  {t('match.filters')}{activeFilterCount ? ` · ${activeFilterCount}` : ''}
                </Text>
              </Pressable>
            </Row>
          </View>
        }
        renderItem={({ item }) => (
          <ResultCard result={item} homeCurrency={homeCurrency} homeCountryLabel={homeCountryLabel} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="funnel-outline"
            title={t('match.emptyBucket')}
            body={t('match.emptyBucketCta')}
            ctaLabel={activeFilterCount ? t('match.clearFilters') : undefined}
            onCta={activeFilterCount ? () => setFilters(DEFAULT_FILTERS) : undefined}
          />
        }
        ListFooterComponent={
          <Text variant="caption" tone="faint" center style={{ marginTop: spacing.xl }}>
            {t('match.disclaimer')}
          </Text>
        }
      />

      {compareIds.length >= 2 ? (
        <View style={{ position: 'absolute', bottom: spacing.xl, left: spacing.xl, right: spacing.xl }}>
          <Button
            label={t('match.compare', { count: compareIds.length })}
            size="lg"
            icon="git-compare-outline"
            onPress={() => router.push('/compare')}
          />
        </View>
      ) : compareIds.length === 1 ? (
        <View style={{ position: 'absolute', bottom: spacing.xl, alignSelf: 'center' }}>
          <View
            style={{
              backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1,
              borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
            }}
          >
            <Text variant="caption" tone="secondary">{t('match.compareHint')}</Text>
          </View>
        </View>
      ) : null}

      <FiltersModal
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onChange={setFilters}
        resultCount={filtered.length}
        budgetPresets={budgetPresets}
        homeCurrency={homeCurrency}
      />
    </Screen>
  );
}

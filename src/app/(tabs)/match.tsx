import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, View } from 'react-native';
import { DEFAULT_FILTERS, FiltersModal, type MatchFilters } from '@/components/match/FiltersModal';
import { MatchHero } from '@/components/match/MatchHero';
import { ResultCard } from '@/components/match/ResultCard';
import { UpgradeSheet } from '@/components/plan/UpgradeSheet';
import { Button } from '@/components/ui/Button';
import { Row } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { Skeleton, SkeletonCards } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { SURVEY_COINS, SurveySheet } from '@/components/ui/SurveySheet';
import { Text } from '@/components/ui/Text';
import { fonts, radius, spacing } from '@/constants/theme';
import { useMatchData } from '@/hooks/useMatchData';
import { useTheme } from '@/hooks/useTheme';
import { homeCurrencyFor } from '@/services/currency';
import { trueAnnualIn } from '@/services/costs';
import { useFeedbackStore } from '@/store/useFeedbackStore';
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
  const clearCompare = useSavedStore((s) => s.clearCompare);
  const [bucket, setBucket] = useState<MatchStatus>('eligible');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<MatchFilters>(DEFAULT_FILTERS);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [surveyOpen, setSurveyOpen] = useState(false);
  const surveyDone = useFeedbackStore((s) => Boolean(s.answers['match']));
  const surveyDismissed = useFeedbackStore((s) => s.dismissed.includes('match'));
  const dismissSurvey = useFeedbackStore((s) => s.dismiss);
  const listRef = useRef<FlatList>(null);
  const scrollTop = () => listRef.current?.scrollToOffset({ offset: 0, animated: false });

  const homeCurrency = profile ? homeCurrencyFor(profile) : 'USD';
  const homeCountryLabel = profile ? t(`countries.${profile.homeCountry}`) : '';

  const filtered = useMemo(() => {
    if (!matchData) return [];
    return matchData.results.filter((r) => {
      const { course } = r;
      if (filters.countries.length > 0 && !filters.countries.includes(course.country)) return false;
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

  // Land the user on a bucket that has content: a student with no English
  // test yet sees 0 eligible, and defaulting into an empty tab with
  // "loosen your filters" advice was misleading. Manual taps always win.
  const userPickedBucket = useRef(false);
  useEffect(() => {
    if (userPickedBucket.current || !matchData) return;
    if (byBucket[bucket].length === 0) {
      const first = BUCKETS.find(({ key }) => byBucket[key].length > 0);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot redirect off an empty default tab
      if (first && first.key !== bucket) setBucket(first.key);
    }
  }, [matchData, byBucket, bucket]);

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

  // Per-country result counts under the other active filters, so the modal
  // shows which countries the current budget/duration actually reaches.
  const countryCounts = useMemo(() => {
    const counts: Partial<Record<string, number>> = {};
    if (!matchData) return counts;
    for (const r of matchData.results) {
      const { course } = r;
      if (filters.field && course.field !== filters.field) continue;
      if (filters.duration === 'short' && course.durationYears > 2) continue;
      if (filters.duration === 'medium' && (course.durationYears < 3 || course.durationYears > 4)) continue;
      if (filters.duration === 'long' && course.durationYears < 5) continue;
      if (filters.budget) {
        const col = matchData.colByCity.get(course.campusCity);
        if (col && trueAnnualIn(course, col, homeCurrency) > filters.budget) continue;
      }
      counts[course.country] = (counts[course.country] ?? 0) + 1;
    }
    return counts;
  }, [matchData, filters, homeCurrency]);

  // Cheapest option matching everything except the budget — powers the
  // zero-results explanation ("raise the budget to ≈X to include it").
  const cheapestNoBudget = useMemo(() => {
    if (!matchData) return null;
    let min: number | null = null;
    for (const r of matchData.results) {
      const { course } = r;
      if (filters.countries.length > 0 && !filters.countries.includes(course.country)) continue;
      if (filters.field && course.field !== filters.field) continue;
      if (filters.duration === 'short' && course.durationYears > 2) continue;
      if (filters.duration === 'medium' && (course.durationYears < 3 || course.durationYears > 4)) continue;
      if (filters.duration === 'long' && course.durationYears < 5) continue;
      const col = matchData.colByCity.get(course.campusCity);
      if (!col) continue;
      const cost = trueAnnualIn(course, col, homeCurrency);
      if (min === null || cost < min) min = cost;
    }
    return min;
  }, [matchData, filters, homeCurrency]);

  const activeFilterCount =
    (filters.countries.length > 0 ? 1 : 0) + (filters.field ? 1 : 0) + (filters.duration !== 'any' ? 1 : 0) + (filters.budget ? 1 : 0);

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
        ref={listRef}
        data={list}
        keyExtractor={(r) => r.course.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.lg }}>
            <MatchHero profile={profile} results={filtered} matchedCount={filtered.length} />

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(tabs)/assistant')}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: spacing.md,
                backgroundColor: colors.accentSoft, borderRadius: radius.lg,
                paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Ionicons name="sparkles" size={18} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text variant="label" tone="accent">{t('assistant.entry')}</Text>
                <Text variant="caption" tone="secondary">{t('assistant.entrySub')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.accent} />
            </Pressable>

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
                    onPress={() => {
                      userPickedBucket.current = true;
                      setBucket(key);
                      scrollTop();
                    }}
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
                    <Text variant="title" color={color} style={{ fontFamily: fonts.black, fontSize: 27, lineHeight: 31 }}>
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
              {byBucket[bucket].length > 0 ? (
                <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
                  {t(`match.${bucket}Desc`)}
                </Text>
              ) : (
                <View style={{ flex: 1 }} />
              )}
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

            {!surveyDone && !surveyDismissed && filtered.length > 0 ? (
              // Trigger-based micro survey right after the meaningful moment
              // (seeing match results) — the mechanic from ANALYTICS.md.
              <View
                style={{
                  backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1,
                  borderColor: colors.border, padding: spacing.lg, gap: spacing.sm,
                }}
              >
                <Row gap={spacing.sm}>
                  <Ionicons name="star-outline" size={16} color={colors.borderline} />
                  <Text variant="label" style={{ flex: 1 }}>{t('survey.matchQuestion')}</Text>
                </Row>
                <Row gap={spacing.sm}>
                  <Button
                    label={t('survey.rateCta', { coins: SURVEY_COINS })}
                    size="sm"
                    onPress={() => setSurveyOpen(true)}
                  />
                  <Button
                    label={t('survey.later')}
                    size="sm"
                    variant="ghost"
                    onPress={() => dismissSurvey('match')}
                  />
                </Row>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <ResultCard
            result={item}
            homeCurrency={homeCurrency}
            homeCountryLabel={homeCountryLabel}
            onCompareBlocked={() => setUpgradeOpen(true)}
          />
        )}
        ListEmptyComponent={
          bucket === 'eligible' && profile.english.test === 'none' && byBucket.borderline.length > 0 ? (
            // The real reason nothing is "eligible": no English test on file.
            <EmptyState
              icon="key-outline"
              title={t('match.emptyEligibleTitle')}
              body={t('match.emptyEligibleNoEnglish', { count: byBucket.borderline.length })}
              ctaLabel={t('match.addEnglishCta')}
              onCta={() => router.push('/onboarding/grades')}
            />
          ) : activeFilterCount > 0 ? (
            <EmptyState
              icon="funnel-outline"
              title={t('match.emptyBucket')}
              body={t('match.emptyBucketCta')}
              ctaLabel={t('match.clearFilters')}
              onCta={() => setFilters(DEFAULT_FILTERS)}
            />
          ) : (
            // No filters set — "loosen your filters" would be nonsense. An
            // empty bucket here is usually GOOD news; say what it means.
            <EmptyState
              icon={bucket === 'pathway' ? 'trending-up-outline' : 'checkmark-circle-outline'}
              title={t(`match.emptyNoFilters_${bucket}`)}
              body={t(`match.emptyNoFiltersBody_${bucket}`)}
            />
          )
        }
        ListFooterComponent={
          <Text variant="caption" tone="faint" center style={{ marginTop: spacing.xl }}>
            {t('match.disclaimer')}
          </Text>
        }
      />

      {compareIds.length >= 2 ? (
        <View
          style={{
            position: 'absolute', bottom: spacing.xl, left: spacing.xl, right: spacing.xl,
            flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
          }}
        >
          <Button
            label={t('match.compare', { count: compareIds.length })}
            size="lg"
            variant="pop"
            icon="git-compare-outline"
            onPress={() => router.push('/compare')}
            style={{ flex: 1 }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('match.clearCompare')}
            onPress={clearCompare}
            style={({ pressed }) => ({
              width: 48, height: 48, borderRadius: radius.full, backgroundColor: colors.surface,
              borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons name="close" size={20} color={colors.inkSecondary} />
          </Pressable>
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
        onClose={() => {
          setFiltersOpen(false);
          scrollTop();
        }}
        filters={filters}
        onChange={setFilters}
        resultCount={filtered.length}
        budgetPresets={budgetPresets}
        homeCurrency={homeCurrency}
        countryCounts={countryCounts}
        cheapestNoBudget={cheapestNoBudget}
      />
      <UpgradeSheet visible={upgradeOpen} context="compare" onClose={() => setUpgradeOpen(false)} />
      <SurveySheet
        visible={surveyOpen}
        surveyId="match"
        question={t('survey.matchQuestion')}
        onClose={() => setSurveyOpen(false)}
      />
    </Screen>
  );
}

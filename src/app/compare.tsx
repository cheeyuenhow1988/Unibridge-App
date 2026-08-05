import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { goBack } from '@/services/nav';
import * as Sharing from 'expo-sharing';
import { useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { VerifiedCostBadge } from '@/components/cost/VerifiedCostBadge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Row } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { FLAGS, RENT_PERIOD } from '@/constants/countries';
import { fonts, light, radius, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useMatchData } from '@/hooks/useMatchData';
import { useTheme } from '@/hooks/useTheme';
import { listAttractions } from '@/services/api';
import { costBreakdown } from '@/services/costs';
import { convert, formatMoney, homeCurrencyFor } from '@/services/currency';
import { shareMessage } from '@/services/share';
import { useSavedStore } from '@/store/useSavedStore';
import type { Attraction } from '@/types/models';

const LABEL_W = 104;
const COL_W = 224;
const HEIGHTS = {
  header: 128, eligibility: 56, tuitionSemester: 60, tuitionYear: 60, tuitionTotal: 60,
  living: 126, trueTotal: 96, durationIntakes: 76, english: 52, recognition: 56, attractions: 210, actions: 64,
} as const;

function Cell({ height, children, center }: PropsWithChildren<{ height: number; center?: boolean }>) {
  return (
    <View style={{ height, justifyContent: 'center', alignItems: center ? 'center' : 'flex-start', paddingVertical: spacing.xs }}>
      {children}
    </View>
  );
}

export default function CompareScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const compareIds = useSavedStore((s) => s.compareIds);
  const removeFromCompare = useSavedStore((s) => s.removeFromCompare);
  const savedIds = useSavedStore((s) => s.savedCourseIds);
  const toggleSaved = useSavedStore((s) => s.toggleSaved);
  const { matchData, profile, loading, error, retry } = useMatchData();
  const shareRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const columns = useMemo(() => {
    if (!matchData || !profile) return [];
    return compareIds
      .map((id) => matchData.resultByCourseId.get(id))
      .filter((r): r is NonNullable<typeof r> => !!r)
      .map((result) => {
        const col = matchData.colByCity.get(result.course.campusCity)!;
        return { result, col, costs: costBreakdown(result.course, col) };
      });
  }, [matchData, profile, compareIds]);

  const attractionsState = useAsync(async () => {
    const instIds = [...new Set(columns.map((c) => c.result.institution.id))];
    const all = await Promise.all(instIds.map((id) => listAttractions(id)));
    return new Map(instIds.map((id, i) => [id, all[i]!.sort((a, b) => a.distanceMinutes - b.distanceMinutes).slice(0, 3)]));
  }, [columns.map((c) => c.result.course.id).join(',')]);

  const home = profile ? homeCurrencyFor(profile) : 'USD';
  const cheapestId = useMemo(() => {
    if (columns.length === 0) return null;
    return columns.reduce((min, c) =>
      convert(c.costs.trueTotal, c.costs.currency, home) < convert(min.costs.trueTotal, min.costs.currency, home) ? c : min,
    ).result.course.id;
  }, [columns, home]);

  const onShare = async () => {
    try {
      setSharing(true);
      if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
        // Web fallback: share/copy a clean text summary instead of dead-ending.
        const summary = [
          t('compare.shareTitle'),
          ...columns.map(({ result, costs }) =>
            `${FLAGS[result.course.country]} ${result.course.name} — ${result.institution.name}\n` +
            `  ${formatMoney(costs.tuitionPerYear, costs.currency)} ${t('common.perYear')} · ${t('compare.trueTotal')} ` +
            `${formatMoney(convert(costs.trueTotal, costs.currency, home), home)} · ${t(`match.${result.status}`)}`,
          ),
          t('match.disclaimer'),
        ].join('\n\n');
        await shareMessage(summary, t('common.copiedToClipboard'));
        return;
      }
      const uri = await captureRef(shareRef, { format: 'png', quality: 0.95 });
      await Sharing.shareAsync(uri.startsWith('file://') ? uri : `file://${uri}`, { mimeType: 'image/png' });
    } catch {
      Alert.alert(t('compare.shareUnavailable'));
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <Screen edges={['top', 'bottom']}>
        <SkeletonCards count={4} height={110} />
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

  const dual = (amount: number, currency: typeof columns[number]['costs']['currency']) => (
    <View>
      <Text variant="bodyMedium">{formatMoney(amount, currency)}</Text>
      {currency !== home ? (
        <Text variant="caption" tone="faint">≈ {formatMoney(convert(amount, currency, home), home)}</Text>
      ) : null}
    </View>
  );

  const labels: { key: keyof typeof HEIGHTS; label: string }[] = [
    { key: 'eligibility', label: t('compare.eligibility') },
    { key: 'tuitionSemester', label: t('compare.tuitionSemester') },
    { key: 'tuitionYear', label: t('compare.tuitionYear') },
    { key: 'tuitionTotal', label: t('compare.tuitionTotal') },
    { key: 'living', label: t('compare.living') },
    { key: 'trueTotal', label: t('compare.trueTotal') },
    { key: 'durationIntakes', label: t('compare.durationIntakes') },
    { key: 'english', label: t('compare.english') },
    { key: 'recognition', label: t('compare.recognition', { country: t(`countries.${profile.homeCountry}`) }) },
    { key: 'attractions', label: t('compare.attractions') },
    { key: 'actions', label: t('compare.actions') },
  ];

  return (
    <Screen padded={false} edges={['top', 'bottom']}>
      <Row style={{ justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
        <Pressable accessibilityRole="button" onPress={() => goBack('/match')} hitSlop={10}>
          <Ionicons name="chevron-down" size={24} color={colors.ink} />
        </Pressable>
        <Text variant="heading">{t('compare.title')}</Text>
        <Pressable accessibilityRole="button" onPress={onShare} hitSlop={10} disabled={sharing || columns.length < 2}>
          <Ionicons name="share-outline" size={22} color={columns.length < 2 ? colors.inkFaint : colors.accent} />
        </Pressable>
      </Row>

      {columns.length < 2 ? (
        <EmptyState icon="git-compare-outline" title={t('compare.empty')} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', paddingLeft: spacing.md }}>
            <View style={{ width: LABEL_W, paddingTop: HEIGHTS.header }}>
              {labels.map(({ key, label }) => (
                <Cell key={key} height={HEIGHTS[key]}>
                  <Text variant="caption" tone="faint" style={{ fontFamily: fonts.bold }} numberOfLines={3}>
                    {label}
                  </Text>
                </Cell>
              ))}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: spacing.lg }}>
              {columns.map(({ result, col, costs }) => {
                const { course, institution } = result;
                const cheapest = course.id === cheapestId;
                const saved = savedIds.includes(course.id);
                const top3 = attractionsState.data?.get(institution.id) ?? [];
                return (
                  <View
                    key={course.id}
                    style={{
                      width: COL_W,
                      marginLeft: spacing.sm,
                      borderRadius: radius.lg,
                      borderWidth: 1.5,
                      borderColor: cheapest ? colors.accent : colors.border,
                      backgroundColor: colors.surface,
                      padding: spacing.md,
                    }}
                  >
                    <View style={{ height: HEIGHTS.header, gap: 4 }}>
                      <Text variant="caption" tone="secondary" numberOfLines={1}>
                        {FLAGS[course.country]} {institution.name}
                      </Text>
                      <Text variant="sub" numberOfLines={3}>{course.name}</Text>
                      <Text variant="caption" tone="faint">{course.campusCity}</Text>
                    </View>

                    <Cell height={HEIGHTS.eligibility}>
                      <Badge tone={result.status} label={t(`match.${result.status}`)} />
                    </Cell>
                    <Cell height={HEIGHTS.tuitionSemester}>{dual(costs.tuitionPerSemester, costs.currency)}</Cell>
                    <Cell height={HEIGHTS.tuitionYear}>{dual(costs.tuitionPerYear, costs.currency)}</Cell>
                    <Cell height={HEIGHTS.tuitionTotal}>{dual(costs.tuitionTotal, costs.currency)}</Cell>

                    <Cell height={HEIGHTS.living}>
                      <View style={{ gap: 2 }}>
                        <Text variant="bodyMedium">{formatMoney(costs.livingMonthly, costs.currency)}</Text>
                        <VerifiedCostBadge col={col} />
                        <Text variant="caption" tone="faint">
                          {t('compare.rent')}{' '}
                          {RENT_PERIOD[col.country] === 'week'
                            ? `${formatMoney(Math.round((costs.rentMonthly * 12) / 52), costs.currency)}${t('costsheet.perWeek')}`
                            : `${formatMoney(costs.rentMonthly, costs.currency)}${t('costsheet.perMonth')}`}
                          {' · '}{t('compare.food')} {formatMoney(costs.foodMonthly, costs.currency)}
                        </Text>
                        <Text variant="caption" tone="faint">
                          {t('compare.transport')} {formatMoney(costs.transportMonthly, costs.currency)}
                        </Text>
                      </View>
                    </Cell>

                    <Cell height={HEIGHTS.trueTotal}>
                      <View style={{ gap: 3 }}>
                        <Text variant="heading" tone={cheapest ? 'accent' : 'primary'}>
                          {formatMoney(convert(costs.trueTotal, costs.currency, home), home)}
                        </Text>
                        <Text variant="caption" tone="faint" numberOfLines={2}>
                          {t('compare.trueTotalNote', { years: t('common.years', { count: costs.durationYears }), currency: home })}
                        </Text>
                        {cheapest ? <Badge tone="accent" icon="trophy" label={t('compare.cheapest')} /> : null}
                      </View>
                    </Cell>

                    <Cell height={HEIGHTS.durationIntakes}>
                      <View style={{ gap: 2 }}>
                        <Text variant="bodyMedium">{t('common.years', { count: course.durationYears })}</Text>
                        <Text variant="caption" tone="faint" numberOfLines={2}>{course.intakes.join(' · ')}</Text>
                      </View>
                    </Cell>

                    <Cell height={HEIGHTS.english}>
                      <Text variant="bodyMedium">
                        {t('course.ieltsOrToefl', { ielts: course.english.ielts, toefl: course.english.toefl })}
                      </Text>
                    </Cell>

                    <Cell height={HEIGHTS.recognition}>
                      <Badge
                        tone={result.recognizedAtHome ? 'eligible' : 'danger'}
                        icon={result.recognizedAtHome ? 'checkmark-circle' : 'alert-circle'}
                        label={result.recognizedAtHome ? t('match.recognized', { country: t(`countries.${profile.homeCountry}`) }) : t('match.notRecognized')}
                      />
                    </Cell>

                    <Cell height={HEIGHTS.attractions}>
                      <View style={{ gap: spacing.sm }}>
                        {top3.map((a: Attraction) => (
                          <Row key={a.id} gap={spacing.sm}>
                            <Image
                              source={{ uri: a.image }}
                              style={{ width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt }}
                            />
                            <View style={{ flex: 1 }}>
                              <Text variant="caption" numberOfLines={1}>{a.name}</Text>
                              <Text variant="caption" tone="faint">{t('common.minutes', { count: a.distanceMinutes })}</Text>
                            </View>
                          </Row>
                        ))}
                      </View>
                    </Cell>

                    <Cell height={HEIGHTS.actions}>
                      <Row gap={spacing.sm}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={t('common.save')}
                          onPress={() => toggleSaved(course.id)}
                          hitSlop={8}
                          style={{ width: 40, height: 40, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Ionicons name={saved ? 'heart' : 'heart-outline'} size={18} color={saved ? colors.danger : colors.inkSecondary} />
                        </Pressable>
                        <Button label={t('common.apply')} size="sm" onPress={() => router.push(`/apply/${course.id}`)} />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={t('compare.removeFromCompare')}
                          onPress={() => removeFromCompare(course.id)}
                          hitSlop={8}
                          style={{ width: 40, height: 40, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Ionicons name="close" size={18} color={colors.inkSecondary} />
                        </Pressable>
                      </Row>
                    </Cell>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          <View style={{ padding: spacing.xl }}>
            <Button
              label={t('compare.shareComparison')}
              icon="share-social-outline"
              variant="secondary"
              loading={sharing}
              onPress={onShare}
            />
          </View>
        </ScrollView>
      )}

      {/* Off-screen, light-themed summary card captured for the share image. */}
      <View
        ref={shareRef}
        collapsable={false}
        style={{ position: 'absolute', left: -9999, width: 420, backgroundColor: light.bg, padding: 24, gap: 14 }}
      >
        <Text variant="title" color={light.ink}>{t('compare.shareTitle')}</Text>
        {columns.map(({ result, costs }) => (
          <View
            key={result.course.id}
            style={{
              backgroundColor: light.surface,
              borderRadius: radius.lg,
              borderWidth: 1.5,
              borderColor: result.course.id === cheapestId ? light.accent : light.border,
              padding: 16,
              gap: 4,
            }}
          >
            <Text variant="caption" color={light.inkSecondary}>
              {FLAGS[result.course.country]} {result.institution.name} · {result.course.campusCity}
            </Text>
            <Text variant="sub" color={light.ink}>{result.course.name}</Text>
            <Text variant="bodyMedium" color={light.accent}>
              {formatMoney(costs.tuitionPerYear, costs.currency)} {t('common.perYear')} · {t('compare.trueTotal')}{' '}
              {formatMoney(convert(costs.trueTotal, costs.currency, home), home)}
            </Text>
            <Text variant="caption" color={light.inkSecondary}>
              {t(`match.${result.status}`)} · {t('course.ieltsOrToefl', { ielts: result.course.english.ielts, toefl: result.course.english.toefl })}
            </Text>
          </View>
        ))}
        <Text variant="caption" color={light.inkFaint}>{t('common.appName')} · {t('match.disclaimer')}</Text>
      </View>
    </Screen>
  );
}

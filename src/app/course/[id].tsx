import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { AmbassadorStrip } from '@/components/explore/AmbassadorStrip';
import { AttractionsCarousel } from '@/components/explore/AttractionsCarousel';
import { CityCostSheet } from '@/components/explore/CityCostSheet';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Divider, Row, SectionHeader } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { FLAGS } from '@/constants/countries';
import { radius, spacing } from '@/constants/theme';
import { useMatchData } from '@/hooks/useMatchData';
import { useTheme } from '@/hooks/useTheme';
import { costBreakdown } from '@/services/costs';
import { convert, formatDual, formatMoney, homeCurrencyFor } from '@/services/currency';
import { pathwayRoutesFor } from '@/services/eligibility';
import { hapticTap } from '@/services/haptics';
import { useSavedStore } from '@/store/useSavedStore';
import { toast } from '@/store/useToastStore';
import type { QualificationId } from '@/types/models';

const SYSTEM_ORDER: QualificationId[] = ['spm', 'stpm', 'uec', 'alevels', 'ib', 'hkdse', 'gsat', 'atar', 'gpa'];
const SYSTEM_LABEL: Record<QualificationId, string> = {
  spm: 'SPM', stpm: 'STPM', uec: 'UEC', alevels: 'A-Levels', ib: 'IB',
  hkdse: 'HKDSE', gsat: 'GSAT', atar: 'ATAR', gpa: 'GPA',
};

export default function CourseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { matchData, profile, loading, error, retry } = useMatchData();
  const savedIds = useSavedStore((s) => s.savedCourseIds);
  const [costSheetOpen, setCostSheetOpen] = useState(false);
  const toggleSavedRaw = useSavedStore((s) => s.toggleSaved);
  const { t: tSave } = useTranslation();
  const toggleSaved = (id: string, wasSaved: boolean) => {
    hapticTap();
    toast(wasSaved ? tSave('common.removedToast') : tSave('common.savedToast'));
    toggleSavedRaw(id);
  };

  const result = matchData?.resultByCourseId.get(id);
  const home = profile ? homeCurrencyFor(profile) : 'USD';
  const col = result ? matchData?.colByCity.get(result.course.campusCity) : undefined;
  const costs = result && col ? costBreakdown(result.course, col) : null;
  const pathways =
    result && result.status === 'pathway' && matchData
      ? pathwayRoutesFor(result.course, matchData.results.map((r) => r.course))
      : [];

  if (loading) {
    return (
      <Screen edges={['top', 'bottom']}>
        <SkeletonCards count={4} height={130} />
      </Screen>
    );
  }
  if (error || !result || !profile || !costs) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ErrorState onRetry={retry} />
      </Screen>
    );
  }

  const { course, institution } = result;
  const saved = savedIds.includes(course.id);
  const statusColor = { eligible: colors.eligible, borderline: colors.borderline, pathway: colors.pathway }[result.status];

  const costRow = (label: string, amount: number, note?: string) => (
    <Row style={{ justifyContent: 'space-between', paddingVertical: spacing.xs }}>
      <Text variant="body" tone="secondary" style={{ flex: 1 }}>
        {label}{note ? ` (${note})` : ''}
      </Text>
      <Text variant="bodyMedium">{formatMoney(amount, course.currency)}</Text>
    </Row>
  );

  return (
    <Screen padded={false} edges={['top']}>
      <Row style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.save')} onPress={() => toggleSaved(course.id, saved)} hitSlop={10}>
          <Ionicons name={saved ? 'heart' : 'heart-outline'} size={22} color={saved ? colors.danger : colors.ink} />
        </Pressable>
      </Row>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120 }}>
        <View style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.sm }}>
            <Pressable accessibilityRole="button" onPress={() => router.push(`/institution/${institution.id}`)}>
              <Row gap={6}>
                <Text variant="caption" tone="accent">
                  {FLAGS[course.country]} {institution.name}
                </Text>
                {institution.verifiedPartner ? <Ionicons name="shield-checkmark" size={13} color={colors.verified} /> : null}
                <Ionicons name="chevron-forward" size={12} color={colors.accent} />
              </Row>
            </Pressable>
            <Text variant="title">{course.name}</Text>
            <Row wrap gap={6}>
              <Badge tone="neutral" label={t(`levels.${course.level}`)} />
              <Badge tone="neutral" label={t(`fields.${course.field}`)} />
              <Badge
                tone={result.recognizedAtHome ? 'eligible' : 'danger'}
                icon={result.recognizedAtHome ? 'checkmark-circle' : 'alert-circle'}
                label={
                  result.recognizedAtHome
                    ? t('match.recognized', { country: t(`countries.${profile.homeCountry}`) })
                    : t('match.notRecognized')
                }
              />
            </Row>
          </View>

          <Card style={{ gap: spacing.sm, borderColor: statusColor, borderWidth: 1.5 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text variant="label">{t('course.yourMatch')}</Text>
              <Badge tone={result.status} label={t(`match.${result.status}`)} />
            </Row>
            <Text variant="caption" tone="secondary">
              {t('match.yourScore', { score: Math.round(result.score * 100) / 100 })} · {result.requirement.display}
            </Text>
            {result.reasons.map((r) => (
              <Row key={r.key} gap={5}>
                <Ionicons name="information-circle-outline" size={14} color={statusColor} />
                <Text variant="caption" color={statusColor} style={{ flex: 1 }}>
                  {t(r.key, r.params)}
                </Text>
              </Row>
            ))}
          </Card>

          <Row gap={spacing.md} wrap>
            {[
              { icon: 'time-outline' as const, label: t('common.duration'), value: t('common.years', { count: course.durationYears }) },
              { icon: 'calendar-outline' as const, label: t('common.intakes'), value: course.intakes.slice(0, 2).join(' · ') },
              { icon: 'location-outline' as const, label: t('course.campusCity'), value: course.campusCity },
              { icon: 'language-outline' as const, label: t('common.english'), value: t('course.ieltsOrToefl', { ielts: course.english.ielts, toefl: course.english.toefl }) },
            ].map((f) => (
              <View
                key={f.label}
                style={{
                  flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.md,
                  borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: 4,
                }}
              >
                <Row gap={5}>
                  <Ionicons name={f.icon} size={13} color={colors.accent} />
                  <Text variant="micro" tone="faint">{f.label.toUpperCase()}</Text>
                </Row>
                <Text variant="label" numberOfLines={2}>{f.value}</Text>
              </View>
            ))}
          </Row>

          <Card style={{ gap: spacing.xs }}>
            <Text variant="label" tone="accent">{t('course.tuition')}</Text>
            <Text variant="heading">
              {formatDual(course.tuitionPerYear, course.currency, home)}{' '}
              <Text variant="caption" tone="faint">{t('common.perYear')}</Text>
            </Text>
            <Text variant="caption" tone="secondary">
              {t('course.perSemesterShort', { amount: formatMoney(course.tuitionPerSemester, course.currency) })} ·{' '}
              {t('course.fullCourse', { amount: formatMoney(costs.tuitionTotal, course.currency) })}
            </Text>
          </Card>

          <SectionHeader title={t('course.entryRequirements')} />
          <Card style={{ gap: spacing.sm }}>
            <Text variant="label">{t('course.localStudents')}</Text>
            <Text variant="caption" tone="secondary">{course.localRequirementNote}</Text>
            <Divider style={{ marginVertical: spacing.sm }} />
            <Text variant="label">{t('course.internationalStudents')}</Text>
            {SYSTEM_ORDER.map((q) => (
              <Row key={q} style={{ justifyContent: 'space-between', paddingVertical: 3 }}>
                <Text
                  variant="caption"
                  tone={q === profile.qualification ? 'accent' : 'secondary'}
                >
                  {SYSTEM_LABEL[q]}{q === profile.qualification ? ' ●' : ''}
                </Text>
                <Text variant="caption" tone={q === profile.qualification ? 'accent' : 'primary'}>
                  {course.requirements[q].display}
                </Text>
              </Row>
            ))}
            <Divider style={{ marginVertical: spacing.sm }} />
            <Row style={{ justifyContent: 'space-between' }}>
              <Text variant="caption" tone="secondary">{t('course.englishRequirement')}</Text>
              <Text variant="caption">{t('course.ieltsOrToefl', { ielts: course.english.ielts, toefl: course.english.toefl })}</Text>
            </Row>
          </Card>

          <SectionHeader title={t('course.trueCost')} />
          <Card style={{ gap: spacing.xs }}>
            <Text variant="caption" tone="secondary">
              {t('course.trueCostSubtitle', { years: t('common.years', { count: course.durationYears }), currency: home })}
            </Text>
            {costRow(t('course.tuition'), costs.tuitionTotal)}
            <Pressable accessibilityRole="button" onPress={() => setCostSheetOpen(true)}>
              <Row style={{ justifyContent: 'space-between', paddingVertical: spacing.xs }}>
                <Row gap={4} style={{ flex: 1 }}>
                  <Text variant="body" tone="secondary">{t('course.rent')}</Text>
                  <Ionicons name="information-circle-outline" size={14} color={colors.accent} />
                </Row>
                <Text variant="bodyMedium">{formatMoney(costs.rentMonthly * 12 * course.durationYears, course.currency)}</Text>
              </Row>
              <Text variant="caption" tone="accent" style={{ marginTop: -2 }}>
                {t('course.rentDetail')}
              </Text>
            </Pressable>
            {costRow(t('course.food'), costs.foodMonthly * 12 * course.durationYears)}
            {costRow(t('course.utilities'), costs.utilitiesMonthly * 12 * course.durationYears)}
            {costRow(t('course.transport'), costs.transportMonthly * 12 * course.durationYears)}
            {costRow(t('course.insurance'), costs.insuranceTotal)}
            {costRow(t('course.visa'), costs.visaFee, t('common.oneOff'))}
            {costRow(t('course.oneOffFees'), costs.oneOffFees, t('common.oneOff'))}
            <Divider style={{ marginVertical: spacing.sm }} />
            <Row style={{ justifyContent: 'space-between' }}>
              <Text variant="label">{t('course.totalTrueCost')}</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="heading" tone="accent">
                  {formatMoney(convert(costs.trueTotal, course.currency, home), home)}
                </Text>
                <Text variant="caption" tone="faint">{formatMoney(costs.trueTotal, course.currency)}</Text>
              </View>
            </Row>
          </Card>

          <Card tone="alt" style={{ gap: 4 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text variant="caption" tone="secondary">{t('course.applicationFee')}</Text>
              <Text variant="label">{formatMoney(course.applicationFee, course.currency)}</Text>
            </Row>
            {institution.verifiedPartner ? (
              <Badge tone="verified" icon="pricetag" label={t('course.feeWaived')} />
            ) : null}
          </Card>

          {pathways.length > 0 ? (
            <>
              <SectionHeader title={t('course.pathwayRoutes')} />
              <View style={{ gap: spacing.md }}>
                {pathways.map((p) => (
                  <Card key={p.id} onPress={() => router.push(`/course/${p.id}`)} style={{ gap: 4 }}>
                    <Text variant="sub">{p.name}</Text>
                    <Text variant="caption" tone="faint">
                      {t(`levels.${p.level}`)} · {t('common.years', { count: p.durationYears })} ·{' '}
                      {formatDual(p.tuitionPerYear, p.currency, home)} {t('common.perYear')}
                    </Text>
                    <Text variant="caption" tone="accent">
                      {t('course.pathwayLeadsTo', { fields: (p.pathwayFor ?? []).map((f) => t(`fields.${f}`)).join(', ') })}
                    </Text>
                  </Card>
                ))}
              </View>
            </>
          ) : null}

          <SectionHeader title={t('institution.studentsHere')} />
          <AmbassadorStrip institutionId={institution.id} />

          <SectionHeader title={t('institution.aroundCampus')} />
          <AttractionsCarousel institutionId={institution.id} city={course.campusCity} />
        </View>
      </ScrollView>

      {col ? <CityCostSheet visible={costSheetOpen} col={col} home={home} onClose={() => setCostSheetOpen(false)} /> : null}

      <View
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          flexDirection: 'row', gap: spacing.sm, padding: spacing.lg, paddingBottom: spacing.xl,
          backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.save')}
          onPress={() => toggleSaved(course.id, saved)}
          style={{
            width: 48, height: 48, borderRadius: radius.full, borderWidth: 1.5,
            borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
          }}
        >
          <Ionicons name={saved ? 'heart' : 'heart-outline'} size={20} color={saved ? colors.danger : colors.ink} />
        </Pressable>
        <Button
          label={t('course.askQuestion')}
          variant="secondary"
          onPress={() => router.push(`/chat/${institution.id}`)}
          style={{ flex: 1 }}
        />
        <Button label={t('common.apply')} onPress={() => router.push(`/apply/${course.id}`)} style={{ flex: 1 }} />
      </View>
    </Screen>
  );
}

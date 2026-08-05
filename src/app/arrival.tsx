import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { goBack } from '@/services/nav';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Modal, Pressable, View } from 'react-native';
import { LockChip, UpgradeSheet } from '@/components/plan/UpgradeSheet';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { HCarousel } from '@/components/ui/HCarousel';
import { Row, SectionHeader } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { FLAGS } from '@/constants/countries';
import { radius, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useTheme } from '@/hooks/useTheme';
import { getStudentLife, getWorkRights, listInstitutions } from '@/services/api';
import { formatApprox, formatMoney, homeCurrencyFor } from '@/services/currency';
import { useMatchData } from '@/hooks/useMatchData';
import { useApplicationsStore } from '@/store/useApplicationsStore';
import { usePlan } from '@/store/usePlanStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useSavedStore } from '@/store/useSavedStore';
import type { CountryCode, CurrencyCode, JobListing, LifeSharedBy } from '@/types/models';

/** Free tier sees the first listing of each kind; the rest need Season Pass. */
const FREE_LIFE_LIMIT = 1;

/** Student Life hub — jobs, rooms, wheels and safety for a study city,
 * every item shared by a verified student already there. */
export default function StudentLifeHub() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const profile = useProfileStore((s) => s.profile);
  const home = profile ? homeCurrencyFor(profile) : 'USD';
  const state = useAsync(async () => Promise.all([getStudentLife(), listInstitutions()]), []);
  const [cityPick, setCityPick] = useState('Melbourne');
  const [jobSheet, setJobSheet] = useState<JobListing | null>(null);
  const applications = useApplicationsStore((s) => s.applications);
  const savedCourseIds = useSavedStore((s) => s.savedCourseIds);
  const { matchData } = useMatchData();

  const cities = useMemo(() => {
    const withInst = new Set((state.data?.[1] ?? []).map((i) => i.city));
    return Object.keys(state.data?.[0]?.jobsByCity ?? {}).filter((c) => withInst.has(c));
  }, [state.data]);

  // Enrolled somewhere? Lock the hub to that city — jobs and rooms anywhere
  // else are noise once you know where you are going.
  const anchorCity = useMemo(() => {
    const cityOf = (courseId: string) => matchData?.resultByCourseId.get(courseId)?.course.campusCity;
    const c = applications.map((a) => cityOf(a.courseId)).find(Boolean) ??
      savedCourseIds.map(cityOf).find(Boolean);
    return c && (state.data?.[0]?.jobsByCity[c] ?? []).length > 0 ? c : null;
  }, [applications, savedCourseIds, matchData, state.data]);
  const city = anchorCity ?? cityPick;

  const life = state.data?.[0];
  const country = (state.data?.[1] ?? []).find((i) => i.city === city)?.country as CountryCode | undefined;
  const rights = useAsync(async () => (country ? getWorkRights(country) : undefined), [country]);
  const plan = usePlan();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (state.loading) {
    return (
      <Screen edges={['top', 'bottom']}>
        <SkeletonCards count={4} height={110} />
      </Screen>
    );
  }
  if (state.error || !life) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ErrorState onRetry={state.retry} />
      </Screen>
    );
  }

  const jobs = life.jobsByCity[city] ?? [];
  const homes = life.housingByCity[city] ?? [];
  const car = country ? life.carsByCountry[country] : undefined;
  const emergency = country ? life.emergency[country] : undefined;
  const localCurrency = (car?.currency ?? 'USD') as CurrencyCode;

  const sharedBy = (by: LifeSharedBy | null) =>
    by ? (
      <Pressable accessibilityRole="button" onPress={() => router.push(`/ambassador/${by.id}`)}>
        <Row gap={6}>
          <Ionicons name="school-outline" size={13} color={colors.accent} />
          <Text variant="caption" tone="accent">{t('life.sharedBy', { name: by.name, inst: by.inst })}</Text>
        </Row>
      </Pressable>
    ) : null;

  return (
    <Screen scroll edges={['top', 'bottom']} padded={false}>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl }}>
        <Row style={{ paddingTop: spacing.md, gap: spacing.md }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => goBack('/community')} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text variant="title">{t('life.title')}</Text>
            <Text variant="caption" tone="secondary">{t('life.subtitle')}</Text>
          </View>
        </Row>

        {anchorCity ? (
          <Row gap={spacing.sm}>
            <Ionicons name="location" size={15} color={colors.accent} />
            <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
              {t('life.cityFromApp', { city: anchorCity })}
            </Text>
          </Row>
        ) : (
          <HCarousel step={240}>
            {cities.map((c) => (
              <Chip key={c} small label={c} selected={city === c} onPress={() => setCityPick(c)} />
            ))}
          </HCarousel>
        )}

        <Card tone="alt" style={{ gap: spacing.xs }}>
          <Row gap={spacing.sm}>
            <Ionicons name="shield-checkmark" size={18} color={colors.eligible} />
            <Text variant="label">{t('life.safetyTitle')}</Text>
          </Row>
          <Text variant="caption" tone="secondary">
            {country
              ? t('life.safetyBody', { country: t(`countries.${country}`), number: emergency })
              : t('life.safetyBodyNoCountry')}
          </Text>
        </Card>

        <SectionHeader title={t('life.jobsTitle')} />
        {rights.data ? (
          <Row gap={6}>
            <Ionicons name="time-outline" size={14} color={colors.borderline} />
            <Text variant="caption" tone="secondary">
              {t('life.jobsCap', { hours: rights.data.hoursPerWeekTerm })}
            </Text>
          </Row>
        ) : null}
        <View style={{ gap: spacing.md }}>
          {jobs.map((j, idx) => {
            if (plan === 'free' && idx >= FREE_LIFE_LIMIT) {
              return (
                <Card key={j.id} onPress={() => setUpgradeOpen(true)} style={{ gap: 6 }}>
                  <View style={{ opacity: 0.35 }} pointerEvents="none">
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Text variant="sub" style={{ flex: 1 }}>██████ ████</Text>
                      {j.onCampus ? <Badge tone="verified" icon="school" label={t('life.onCampus')} /> : null}
                    </Row>
                    <Text variant="caption" tone="secondary">{city}</Text>
                    <Text variant="bodyMedium" tone="accent">███–███ {t('life.perHour')}</Text>
                  </View>
                  <LockChip onPress={() => setUpgradeOpen(true)} />
                </Card>
              );
            }
            return (
              <Card key={j.id} onPress={() => setJobSheet(j)} style={{ gap: 4 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text variant="sub" style={{ flex: 1 }}>{j.role}</Text>
                  {j.onCampus ? <Badge tone="verified" icon="school" label={t('life.onCampus')} /> : null}
                </Row>
                <Text variant="caption" tone="secondary">
                  {j.spot ? t('life.near', { spot: j.spot }) : city}
                </Text>
                <Text variant="bodyMedium" tone="accent">
                  {formatMoney(j.payHourMin, localCurrency)}–{formatMoney(j.payHourMax, localCurrency)} {t('life.perHour')}
                </Text>
                <Row style={{ justifyContent: 'space-between' }}>
                  {sharedBy(j.sharedBy) ?? <View />}
                  <Text variant="caption" tone="accent">{t('life.jobDetails')} ›</Text>
                </Row>
              </Card>
            );
          })}
          {plan === 'free' && jobs.length > FREE_LIFE_LIMIT ? (
            <Text variant="caption" tone="accent" center>{t('pass.lockedLife')}</Text>
          ) : null}
        </View>

        <SectionHeader title={t('life.housingTitle')} />
        <View style={{ gap: spacing.md }}>
          {homes.map((h, idx) => {
            if (plan === 'free' && idx >= FREE_LIFE_LIMIT) {
              return (
                <Card key={h.id} onPress={() => setUpgradeOpen(true)} style={{ gap: 6 }}>
                  <View style={{ opacity: 0.35 }} pointerEvents="none">
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Text variant="sub" style={{ flex: 1 }}>██████ ██████</Text>
                      {h.verified ? <Badge tone="verified" icon="shield-checkmark" label={t('life.verifiedListing')} /> : null}
                    </Row>
                    <Text variant="caption" tone="secondary">{city}</Text>
                    <Text variant="bodyMedium" tone="accent">████ {t('common.perMonth')}</Text>
                  </View>
                  <LockChip onPress={() => setUpgradeOpen(true)} />
                </Card>
              );
            }
            return (
              <Card key={h.id} style={{ gap: 4 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text variant="sub" style={{ flex: 1 }}>{t(`life.kind_${h.kind}`)}</Text>
                  {h.verified ? <Badge tone="verified" icon="shield-checkmark" label={t('life.verifiedListing')} /> : null}
                </Row>
                <Text variant="caption" tone="secondary">{t('life.minToCampus', { count: h.minutesToCampus })}</Text>
                <Text variant="bodyMedium" tone="accent">
                  {formatMoney(h.priceMonthly, localCurrency)} {t('common.perMonth')}
                  {localCurrency !== home ? `  ·  ${formatApprox(h.priceMonthly, localCurrency, home)}` : ''}
                </Text>
                {sharedBy(h.sharedBy)}
              </Card>
            );
          })}
          {plan === 'free' && homes.length > FREE_LIFE_LIMIT ? (
            <Text variant="caption" tone="accent" center>{t('pass.lockedLife')}</Text>
          ) : null}
        </View>

        <SectionHeader title={t('life.wheelsTitle')} />
        {car ? (
          <Card style={{ gap: spacing.sm }}>
            <Row gap={spacing.sm}>
              <View
                style={{
                  width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.accentSoft,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name="car-outline" size={18} color={colors.accent} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                {car.usedCar ? (
                  <Text variant="caption" tone="secondary">
                    {t('life.usedCar')}: {formatMoney(car.usedCar[0], localCurrency)}–{formatMoney(car.usedCar[1], localCurrency)}
                  </Text>
                ) : null}
                <Text variant="caption" tone="secondary">
                  {t('life.rentalDay')}: {formatMoney(car.rentalDay[0], localCurrency)}–{formatMoney(car.rentalDay[1], localCurrency)}
                </Text>
              </View>
            </Row>
            <Text variant="body" tone="secondary">{car.note}</Text>
          </Card>
        ) : null}

        <SectionHeader title={t('life.financeTitle')} />
        <Card tone="alt" style={{ gap: spacing.md }}>
          {(['loans', 'forex', 'transfer', 'tuitionPay', 'bank'] as const).map((f) => (
            <Row key={f} gap={spacing.md}>
              <Ionicons
                name={{ loans: 'cash-outline', forex: 'card-outline', transfer: 'swap-horizontal-outline', tuitionPay: 'receipt-outline', bank: 'business-outline' }[f] as never}
                size={18}
                color={colors.accent}
              />
              <Text variant="body" tone="secondary" style={{ flex: 1 }}>{t(`life.finance_${f}`)}</Text>
              <Badge tone="neutral" label={t('common.comingSoon')} />
            </Row>
          ))}
          <Text variant="caption" tone="faint">{t('life.financeNote')}</Text>
        </Card>

        <Text variant="caption" tone="faint" center>
          {country ? `${FLAGS[country]} ` : ''}{t('life.indicative')}
        </Text>
      </View>
      <UpgradeSheet visible={upgradeOpen} context="life" onClose={() => setUpgradeOpen(false)} />

      <Modal visible={!!jobSheet} animationType="slide" transparent onRequestClose={() => setJobSheet(null)}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={() => setJobSheet(null)} />
        {jobSheet ? (
          <View
            style={{
              backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
              padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.md,
            }}
          >
            <Row style={{ justifyContent: 'space-between' }}>
              <Text variant="title" style={{ flex: 1 }}>{jobSheet.role}</Text>
              {jobSheet.onCampus ? <Badge tone="verified" icon="school" label={t('life.onCampus')} /> : null}
            </Row>
            <View style={{ gap: spacing.xs, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: spacing.lg }}>
              <Row gap={spacing.sm}>
                <Ionicons name="location-outline" size={15} color={colors.accent} />
                <Text variant="caption">{jobSheet.spot ? t('life.near', { spot: jobSheet.spot }) : city} · {city}</Text>
              </Row>
              <Row gap={spacing.sm}>
                <Ionicons name="cash-outline" size={15} color={colors.accent} />
                <Text variant="caption">
                  {formatMoney(jobSheet.payHourMin, localCurrency)}–{formatMoney(jobSheet.payHourMax, localCurrency)} {t('life.perHour')}
                </Text>
              </Row>
              {jobSheet.hoursNote ? (
                <Row gap={spacing.sm}>
                  <Ionicons name="time-outline" size={15} color={colors.accent} />
                  <Text variant="caption">{t('life.jobHours', { hours: jobSheet.hoursNote })}</Text>
                </Row>
              ) : null}
              {jobSheet.sharedBy ? (
                <Row gap={spacing.sm}>
                  <Ionicons name="school-outline" size={15} color={colors.accent} />
                  <Text variant="caption">{t('life.sharedBy', { name: jobSheet.sharedBy.name, inst: jobSheet.sharedBy.inst })}</Text>
                </Row>
              ) : null}
            </View>

            {jobSheet.contact ? (
              <View style={{ gap: spacing.sm }}>
                <Text variant="label">{t('life.contactTitle')}</Text>
                <Row gap={spacing.sm}>
                  <Ionicons name="person-outline" size={15} color={colors.inkSecondary} />
                  <Text variant="caption" tone="secondary">{jobSheet.contact.name}</Text>
                </Row>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void Linking.openURL(`mailto:${jobSheet.contact!.email}`)}
                >
                  <Row gap={spacing.sm}>
                    <Ionicons name="mail-outline" size={15} color={colors.accent} />
                    <Text variant="caption" tone="accent">{jobSheet.contact.email}</Text>
                  </Row>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    void Linking.openURL(`https://wa.me/${jobSheet.contact!.whatsapp.replace(/\D/g, '')}`)
                  }
                >
                  <Row gap={spacing.sm}>
                    <Ionicons name="logo-whatsapp" size={15} color={colors.accent} />
                    <Text variant="caption" tone="accent">{jobSheet.contact.whatsapp}</Text>
                  </Row>
                </Pressable>
                <Button
                  label={t('life.sendResume')}
                  icon="document-attach-outline"
                  size="lg"
                  onPress={() =>
                    void Linking.openURL(
                      `mailto:${jobSheet.contact!.email}?subject=${encodeURIComponent(
                        t('life.resumeSubject', { role: jobSheet.role, city }),
                      )}&body=${encodeURIComponent(t('life.resumeBody', { name: jobSheet.contact!.name, role: jobSheet.role }))}`,
                    )
                  }
                />
                <Text variant="caption" tone="faint">{t('life.contactNote')}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Modal>
    </Screen>
  );
}

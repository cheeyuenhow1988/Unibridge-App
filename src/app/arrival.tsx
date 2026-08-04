import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
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
import { useProfileStore } from '@/store/useProfileStore';
import type { CountryCode, CurrencyCode, LifeSharedBy } from '@/types/models';

/** Student Life hub — jobs, rooms, wheels and safety for a study city,
 * every item shared by a verified student already there. */
export default function StudentLifeHub() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const profile = useProfileStore((s) => s.profile);
  const home = profile ? homeCurrencyFor(profile) : 'USD';
  const state = useAsync(async () => Promise.all([getStudentLife(), listInstitutions()]), []);
  const [city, setCity] = useState('Melbourne');

  const cities = useMemo(() => {
    const withInst = new Set((state.data?.[1] ?? []).map((i) => i.city));
    return Object.keys(state.data?.[0]?.jobsByCity ?? {}).filter((c) => withInst.has(c));
  }, [state.data]);

  const life = state.data?.[0];
  const country = (state.data?.[1] ?? []).find((i) => i.city === city)?.country as CountryCode | undefined;
  const rights = useAsync(async () => (country ? getWorkRights(country) : undefined), [country]);

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
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text variant="title">{t('life.title')}</Text>
            <Text variant="caption" tone="secondary">{t('life.subtitle')}</Text>
          </View>
        </Row>

        <HCarousel step={240}>
          {cities.map((c) => (
            <Chip key={c} small label={c} selected={city === c} onPress={() => setCity(c)} />
          ))}
        </HCarousel>

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
          {jobs.map((j) => (
            <Card key={j.id} style={{ gap: 4 }}>
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
              {sharedBy(j.sharedBy)}
            </Card>
          ))}
        </View>

        <SectionHeader title={t('life.housingTitle')} />
        <View style={{ gap: spacing.md }}>
          {homes.map((h) => (
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
          ))}
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

        <Text variant="caption" tone="faint" center>
          {country ? `${FLAGS[country]} ` : ''}{t('life.indicative')}
        </Text>
      </View>
    </Screen>
  );
}

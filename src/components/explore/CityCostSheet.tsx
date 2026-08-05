import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Divider, Row } from '@/components/ui/Misc';
import { Text } from '@/components/ui/Text';
import { RENT_PERIOD } from '@/constants/countries';
import { radius, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useTheme } from '@/hooks/useTheme';
import { getFlightFares } from '@/services/api';
import { convert, formatMoney } from '@/services/currency';
import { useProfileStore } from '@/store/useProfileStore';
import type { CostOfLiving, CurrencyCode } from '@/types/models';

interface Props {
  visible: boolean;
  col: CostOfLiving;
  home: CurrencyCode;
  onClose: () => void;
}

/** Rent options (room / studio / whole unit × suburb / CBD) and living costs for a city. */
export function CityCostSheet({ visible, col, home, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const homeCountry = useProfileStore((s) => s.profile?.homeCountry);
  const flights = useAsync(() => getFlightFares(), []);
  const fare = homeCountry ? flights.data?.fares[col.country]?.[homeCountry] : undefined;

  const dual = (n: number) =>
    col.currency === home
      ? formatMoney(n, col.currency)
      : `${formatMoney(n, col.currency)} · ≈${formatMoney(convert(n, col.currency, home), home)}`;

  // Rents are stored monthly, but AU/NZ landlords advertise per week —
  // show the unit students will actually see on listings, explicitly.
  const rentPeriod = RENT_PERIOD[col.country];
  const perUnit = rentPeriod === 'week' ? t('costsheet.perWeek') : t('costsheet.perMonth');
  const rentDual = (monthly: number) => {
    const n = rentPeriod === 'week' ? Math.round((monthly * 12) / 52) : monthly;
    return col.currency === home
      ? `${formatMoney(n, col.currency)}${perUnit}`
      : `${formatMoney(n, col.currency)}${perUnit} · ≈${formatMoney(convert(n, col.currency, home), home)}${perUnit}`;
  };

  const rentRow = (label: string, suburb: number, cbd: number) => (
    <View style={{ gap: 2, paddingVertical: spacing.sm }}>
      <Text variant="label">{label}</Text>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="caption" tone="secondary">{t('costsheet.suburb')}</Text>
        <Text variant="caption">{rentDual(suburb)}</Text>
      </Row>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="caption" tone="secondary">{t('costsheet.cbd')}</Text>
        <Text variant="caption">{rentDual(cbd)}</Text>
      </Row>
    </View>
  );

  const lineRow = (label: string, value: number) => (
    <Row style={{ justifyContent: 'space-between', paddingVertical: spacing.xs }}>
      <Text variant="caption" tone="secondary">{label}</Text>
      <Text variant="caption">{dual(value)}</Text>
    </Row>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose} />
      <SafeAreaView
        edges={['bottom']}
        style={{
          backgroundColor: colors.bg,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          maxHeight: '85%',
        }}
      >
        <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.sm }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text variant="title">{t('costsheet.title', { city: col.city })}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.inkSecondary} />
            </Pressable>
          </Row>
          <Text variant="caption" tone="faint">{t('costsheet.note')}</Text>

          <Text variant="heading" style={{ marginTop: spacing.md }}>{t('compare.rent')}</Text>
          <Text variant="caption" tone="faint">
            {rentPeriod === 'week'
              ? t('costsheet.rentWeeklyNote', { country: t(`countries.${col.country}`) })
              : t('costsheet.rentMonthlyNote')}
          </Text>
          {rentRow(t('costsheet.room'), col.rentOptions.roomSuburb, col.rentOptions.roomCbd)}
          <Divider />
          {rentRow(t('costsheet.studio'), col.rentOptions.studioSuburb, col.rentOptions.studioCbd)}
          <Divider />
          {rentRow(t('costsheet.unit'), col.rentOptions.unitSuburb, col.rentOptions.unitCbd)}

          <Text variant="heading" style={{ marginTop: spacing.md }}>{t('costsheet.livingTitle')}</Text>
          {lineRow(t('costsheet.food'), col.foodMonthly)}
          {lineRow(t('costsheet.mealOut'), col.eatingOutMeal)}
          {lineRow(t('costsheet.utilities'), col.utilitiesMonthly)}
          {lineRow(t('costsheet.transport'), col.transportMonthly)}

          {fare && fare[0] > 0 ? (
            <>
              <Row gap={6} style={{ marginTop: spacing.md }}>
                <Ionicons name="airplane-outline" size={16} color={colors.accent} />
                <Text variant="heading">{t('costsheet.flightsTitle')}</Text>
              </Row>
              {lineRow(t('costsheet.flightLow'), Math.round(convert(fare[0], 'USD', col.currency)))}
              {lineRow(t('costsheet.flightPeak'), Math.round(convert(fare[1], 'USD', col.currency)))}
              <Text variant="caption" tone="faint">{t('costsheet.flightNote')}</Text>
            </>
          ) : null}

          <Text variant="caption" tone="faint" style={{ marginTop: spacing.md }}>
            {t('costsheet.basis')}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

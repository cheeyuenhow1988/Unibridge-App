import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Row } from '@/components/ui/Misc';
import { Text } from '@/components/ui/Text';
import { DEST_COUNTRIES, FLAGS } from '@/constants/countries';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatMoney } from '@/services/currency';
import type { CountryCode, CurrencyCode, FieldId } from '@/types/models';

export type DurationFilter = 'any' | 'short' | 'medium' | 'long';

export interface MatchFilters {
  country: CountryCode | null;
  field: FieldId | null;
  duration: DurationFilter;
  budget: number | null;
}

export const DEFAULT_FILTERS: MatchFilters = { country: null, field: null, duration: 'any', budget: null };

const FIELDS: FieldId[] = ['business', 'engineering', 'it', 'health', 'hospitality', 'design', 'law'];

interface Props {
  visible: boolean;
  onClose: () => void;
  filters: MatchFilters;
  onChange: (filters: MatchFilters) => void;
  resultCount: number;
  budgetPresets: number[];
  homeCurrency: CurrencyCode;
}

export function FiltersModal({ visible, onClose, filters, onChange, resultCount, budgetPresets, homeCurrency }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const section = (title: string, children: ReactNode) => (
    <View style={{ gap: spacing.md }}>
      <Text variant="label">{title}</Text>
      {children}
    </View>
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
        <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text variant="title">{t('match.filters')}</Text>
            <Pressable accessibilityRole="button" onPress={() => onChange(DEFAULT_FILTERS)} hitSlop={8}>
              <Text variant="label" tone="accent">{t('match.clearFilters')}</Text>
            </Pressable>
          </Row>

          {section(
            t('match.filterCountry'),
            <Row wrap gap={spacing.sm}>
              <Chip label={t('match.filterDurationAny')} selected={!filters.country} onPress={() => onChange({ ...filters, country: null })} />
              {DEST_COUNTRIES.map((c) => (
                <Chip
                  key={c}
                  label={`${FLAGS[c]} ${t(`countries.${c}`)}`}
                  selected={filters.country === c}
                  onPress={() => onChange({ ...filters, country: filters.country === c ? null : c })}
                />
              ))}
            </Row>,
          )}

          {section(
            t('match.filterField'),
            <Row wrap gap={spacing.sm}>
              <Chip label={t('match.filterDurationAny')} selected={!filters.field} onPress={() => onChange({ ...filters, field: null })} />
              {FIELDS.map((f) => (
                <Chip
                  key={f}
                  label={t(`fields.${f}`)}
                  selected={filters.field === f}
                  onPress={() => onChange({ ...filters, field: filters.field === f ? null : f })}
                />
              ))}
            </Row>,
          )}

          {section(
            t('match.filterBudget', { currency: homeCurrency }),
            <View style={{ gap: spacing.sm }}>
              <Row wrap gap={spacing.sm}>
                <Chip label={t('match.filterBudgetAny')} selected={!filters.budget} onPress={() => onChange({ ...filters, budget: null })} />
                {budgetPresets.map((b) => (
                  <Chip
                    key={b}
                    label={`≤ ${formatMoney(b, homeCurrency)}`}
                    selected={filters.budget === b}
                    onPress={() => onChange({ ...filters, budget: filters.budget === b ? null : b })}
                  />
                ))}
              </Row>
              <Text variant="caption" tone="faint">{t('match.filterBudgetNote')}</Text>
            </View>,
          )}

          {section(
            t('match.filterDuration'),
            <Row wrap gap={spacing.sm}>
              {(
                [
                  ['any', t('match.filterDurationAny')],
                  ['short', t('match.filterDurationShort')],
                  ['medium', t('match.filterDurationMedium')],
                  ['long', t('match.filterDurationLong')],
                ] as const
              ).map(([key, label]) => (
                <Chip
                  key={key}
                  label={label}
                  selected={filters.duration === key}
                  onPress={() => onChange({ ...filters, duration: key })}
                />
              ))}
            </Row>,
          )}

          <Button label={t('match.applyFilters', { count: resultCount })} size="lg" onPress={onClose} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

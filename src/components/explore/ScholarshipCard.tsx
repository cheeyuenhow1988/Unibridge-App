import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Row } from '@/components/ui/Misc';
import { Text } from '@/components/ui/Text';
import { FLAGS } from '@/constants/countries';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatMoney } from '@/services/currency';
import { useSavedStore } from '@/store/useSavedStore';
import { toast } from '@/store/useToastStore';
import type { Scholarship } from '@/types/models';

/** Reminder choices: days before the deadline. */
const REMINDER_OPTIONS = [
  ['remind1w', 7],
  ['remind2w', 14],
  ['remind1m', 30],
] as const;

const minusDays = (isoDate: string, days: number) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
};

export function ScholarshipCard({ scholarship }: { scholarship: Scholarship }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const saved = useSavedStore((s) => s.savedScholarshipIds.includes(scholarship.id));
  const toggle = useSavedStore((s) => s.toggleScholarship);
  const reminderDays = useSavedStore((s) => s.scholarshipReminders[scholarship.id]);
  const setReminder = useSavedStore((s) => s.setScholarshipReminder);

  const coverage =
    scholarship.coverageType === 'full'
      ? t('scholarships.coverageFull')
      : scholarship.percentTuition
        ? t('scholarships.coveragePercent', { percent: scholarship.percentTuition })
        : t('scholarships.coverageAmount', {
            amount: formatMoney(scholarship.amount ?? 0, scholarship.currency ?? 'USD'),
          });

  return (
    <Card style={{ gap: spacing.sm }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="sub" style={{ flex: 1 }} numberOfLines={2}>{scholarship.name}</Text>
        <Badge tone="accent" label={coverage} />
      </Row>
      <Text variant="caption" tone="secondary">{scholarship.provider}</Text>
      {scholarship.stipendMonthly && scholarship.currency !== undefined ? (
        <Text variant="caption" tone="accent">
          {t('scholarships.stipend', { amount: formatMoney(scholarship.stipendMonthly, scholarship.currency ?? 'USD') })}
        </Text>
      ) : scholarship.stipendMonthly ? (
        <Text variant="caption" tone="accent">
          {t('scholarships.stipend', { amount: String(scholarship.stipendMonthly) })}
        </Text>
      ) : null}
      <Row wrap gap={6}>
        <Badge
          tone="neutral"
          label={
            scholarship.destinationCountry === 'any'
              ? t('scholarships.anyCountry')
              : `${FLAGS[scholarship.destinationCountry]} ${t(`countries.${scholarship.destinationCountry}`)}`
          }
        />
        <Badge
          tone="neutral"
          label={
            scholarship.fields === 'any'
              ? t('scholarships.anyField')
              : scholarship.fields.map((f) => t(`fields.${f}`)).join(' · ')
          }
        />
        <Badge
          tone="neutral"
          label={
            scholarship.nationalities === 'any'
              ? t('scholarships.anyNationality')
              : scholarship.nationalities.map((n) => FLAGS[n]).join(' ')
          }
        />
      </Row>
      <Text variant="caption" tone="faint">{scholarship.eligibilityNote}</Text>
      {scholarship.link ? (
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(scholarship.link!)}>
          <Row gap={5}>
            <Ionicons name="open-outline" size={14} color={colors.accent} />
            <Text variant="caption" tone="accent">{t('scholarships.officialPage')}</Text>
          </Row>
        </Pressable>
      ) : null}
      <Row style={{ justifyContent: 'space-between', marginTop: spacing.xs }}>
        <Text variant="caption" tone="danger">
          {t('scholarships.deadline', { date: scholarship.deadline })}
        </Text>
        <Button
          label={saved ? t('scholarships.added') : t('scholarships.addToApplications')}
          size="sm"
          variant={saved ? 'secondary' : 'primary'}
          icon={saved ? 'checkmark' : 'add'}
          onPress={() => toggle(scholarship.id)}
        />
      </Row>
      {saved ? (
        <>
          <Row gap={spacing.sm} wrap>
            <Row gap={5}>
              <Ionicons name="alarm-outline" size={15} color={colors.accent} />
              <Text variant="caption" tone="secondary">{t('scholarships.remindTitle')}</Text>
            </Row>
            {REMINDER_OPTIONS.map(([key, days]) => (
              <Chip
                key={key}
                small
                label={t(`scholarships.${key}`)}
                selected={reminderDays === days}
                onPress={() => {
                  const next = reminderDays === days ? null : days;
                  setReminder(scholarship.id, next);
                  if (next !== null) {
                    toast(t('scholarships.reminderSet', { date: minusDays(scholarship.deadline, days) }));
                  }
                }}
              />
            ))}
          </Row>
          {reminderDays ? (
            <Text variant="caption" tone="accent">
              {t('scholarships.reminderLine', {
                date: minusDays(scholarship.deadline, reminderDays),
                days: reminderDays,
              })}
            </Text>
          ) : null}
          <Text variant="caption" tone="accent">{t('scholarships.nextSteps')}</Text>
        </>
      ) : null}
    </Card>
  );
}

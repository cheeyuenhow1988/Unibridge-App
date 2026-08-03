import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Misc';
import { Text } from '@/components/ui/Text';
import { FLAGS } from '@/constants/countries';
import { spacing } from '@/constants/theme';
import { formatMoney } from '@/services/currency';
import { useSavedStore } from '@/store/useSavedStore';
import type { Scholarship } from '@/types/models';

export function ScholarshipCard({ scholarship }: { scholarship: Scholarship }) {
  const { t } = useTranslation();
  const saved = useSavedStore((s) => s.savedScholarshipIds.includes(scholarship.id));
  const toggle = useSavedStore((s) => s.toggleScholarship);

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
        <Text variant="caption" tone="accent">{t('scholarships.nextSteps')}</Text>
      ) : null}
    </Card>
  );
}

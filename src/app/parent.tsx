import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { SAFETY_TEAL } from '@/components/safety/EmergencySheet';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Row, SectionHeader } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { FLAGS } from '@/constants/countries';
import { radius, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useMatchData } from '@/hooks/useMatchData';
import { useTheme } from '@/hooks/useTheme';
import { getSafety } from '@/services/api';
import { costBreakdown } from '@/services/costs';
import { convert, formatMoney, homeCurrencyFor } from '@/services/currency';
import { useApplicationsStore } from '@/store/useApplicationsStore';
import { useProfileStore } from '@/store/useProfileStore';
import { APPLICATION_TIMELINE, type ApplicationStatus, type CountryCode, type HomeCountryCode } from '@/types/models';

const TEAL_SOFT = 'rgba(14, 116, 144, 0.12)';

const STATUS_TONE: Record<ApplicationStatus, 'neutral' | 'pathway' | 'borderline' | 'eligible' | 'verified' | 'accent'> = {
  submitted: 'neutral',
  under_review: 'pathway',
  conditional_offer: 'borderline',
  offer: 'accent',
  accepted: 'eligible',
  coe_issued: 'verified',
};

/**
 * Read-only parent dashboard: status, true costs and the safety net — and
 * deliberately nothing else. No messages, no community, no documents.
 */
export default function ParentView() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const profile = useProfileStore((s) => s.profile);
  const applications = useApplicationsStore((s) => s.applications);
  const { matchData } = useMatchData();
  const safety = useAsync(() => getSafety(), []);

  const home = profile ? homeCurrencyFor(profile) : 'USD';
  const nationality = (profile?.nationality ?? 'MY') as HomeCountryCode;
  const firstDest = (() => {
    for (const a of applications) {
      const r = matchData?.resultByCourseId.get(a.courseId);
      if (r) return { country: r.course.country as CountryCode, city: r.course.campusCity };
    }
    return null;
  })();
  const embassy = firstDest ? safety.data?.embassies[firstDest.country]?.[nationality] : undefined;
  const contact = profile?.emergencyContact;

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={{ gap: spacing.lg, paddingVertical: spacing.md, paddingBottom: spacing.xxxl }}>
        <View
          style={{
            backgroundColor: TEAL_SOFT, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.sm,
          }}
        >
          <Row gap={spacing.sm}>
            <Ionicons name="people-circle-outline" size={22} color={SAFETY_TEAL} />
            <Text variant="label" color={SAFETY_TEAL}>{t('parent.title')}</Text>
          </Row>
          <Text variant="title">{t('parent.greeting', { name: profile?.name ?? '' })}</Text>
          <Text variant="caption" tone="secondary">{t('parent.scopeNote')}</Text>
        </View>

        <SectionHeader title={t('parent.safetyTitle')} />
        <Card style={{ gap: spacing.md }}>
          <Row gap={spacing.sm}>
            <Ionicons name={contact ? 'checkmark-circle' : 'alert-circle-outline'} size={18} color={contact ? colors.eligible : colors.borderline} />
            <Text variant="body" tone="secondary" style={{ flex: 1 }}>
              {contact
                ? t('parent.contactOnFile', { name: contact.name, relationship: contact.relationship })
                : t('parent.noContactOnFile')}
            </Text>
          </Row>
          <Row gap={spacing.sm}>
            <Ionicons name="shield-checkmark" size={18} color={SAFETY_TEAL} />
            <Text variant="body" tone="secondary" style={{ flex: 1 }}>
              {t('parent.sosAvailable', { name: profile?.name ?? '' })}
            </Text>
          </Row>
          {embassy ? (
            <Row gap={spacing.sm}>
              <Ionicons name="business-outline" size={18} color={SAFETY_TEAL} />
              <Text variant="body" tone="secondary" style={{ flex: 1 }}>
                {t('parent.embassyLine', { name: embassy.name, city: embassy.city })}
              </Text>
            </Row>
          ) : null}
        </Card>

        <SectionHeader title={t('parent.applications')} />
        {applications.length === 0 ? (
          <Card tone="alt">
            <Text variant="caption" tone="secondary">{t('applications.empty')}</Text>
          </Card>
        ) : null}
        {applications.map((a) => {
          const r = matchData?.resultByCourseId.get(a.courseId);
          if (!r) return null;
          const idx = APPLICATION_TIMELINE.indexOf(a.status);
          return (
            <Card key={a.id} style={{ gap: spacing.sm }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text variant="caption" tone="secondary" style={{ flex: 1 }} numberOfLines={1}>
                  {FLAGS[r.course.country]} {r.institution.name}
                </Text>
                <Badge tone={STATUS_TONE[a.status]} label={t(`status.${a.status}`)} />
              </Row>
              <Text variant="sub" numberOfLines={2}>{r.course.name}</Text>
              <Row gap={5}>
                {APPLICATION_TIMELINE.map((s, i) => (
                  <View
                    key={s}
                    style={{
                      flex: 1, height: 4, borderRadius: radius.full,
                      backgroundColor: i <= idx ? SAFETY_TEAL : colors.surfaceAlt,
                    }}
                  />
                ))}
              </Row>
              <Text variant="caption" tone="faint">{t('applications.updated', { date: a.updatedAt })}</Text>
            </Card>
          );
        })}

        <SectionHeader title={t('parent.costs')} />
        {applications.map((a) => {
          const r = matchData?.resultByCourseId.get(a.courseId);
          const col = r ? matchData?.colByCity.get(r.course.campusCity) : undefined;
          if (!r || !col) return null;
          const costs = costBreakdown(r.course, col);
          return (
            <Card key={a.id} tone="alt" style={{ gap: 4 }}>
              <Text variant="caption" tone="secondary" numberOfLines={1}>{r.institution.name} · {r.course.campusCity}</Text>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text variant="body" tone="secondary">
                  {formatMoney(convert(r.course.tuitionPerYear, r.course.currency, home), home)} {t('parent.tuitionYear')}
                </Text>
                <Text variant="body" tone="secondary">
                  {formatMoney(convert(costs.livingMonthly, costs.currency, home), home)} {t('parent.livingMonth')}
                </Text>
              </Row>
              <Text variant="caption" tone="faint">
                {t('compare.trueTotal')}: {formatMoney(convert(costs.trueTotal, costs.currency, home), home)}
              </Text>
            </Card>
          );
        })}

        <Button label={t('parent.exit')} icon="exit-outline" variant="secondary" onPress={() => router.back()} />
        <Text variant="caption" tone="faint" center>{t('safety.mockNote')}</Text>
      </View>
    </Screen>
  );
}

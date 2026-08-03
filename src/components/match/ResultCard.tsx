import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Misc';
import { Text } from '@/components/ui/Text';
import { FLAGS } from '@/constants/countries';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatDual } from '@/services/currency';
import { hapticTap } from '@/services/haptics';
import { useSavedStore } from '@/store/useSavedStore';
import { toast } from '@/store/useToastStore';
import type { CurrencyCode, MatchResult } from '@/types/models';

interface Props {
  result: MatchResult;
  homeCurrency: CurrencyCode;
  homeCountryLabel: string;
  compareMode?: boolean;
}

export function ResultCard({ result, homeCurrency, homeCountryLabel, compareMode = true }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const savedIds = useSavedStore((s) => s.savedCourseIds);
  const toggleSaved = useSavedStore((s) => s.toggleSaved);
  const compareIds = useSavedStore((s) => s.compareIds);
  const toggleCompare = useSavedStore((s) => s.toggleCompare);

  const { course, institution, status } = result;
  const statusColor = { eligible: colors.eligible, borderline: colors.borderline, pathway: colors.pathway }[status];
  const saved = savedIds.includes(course.id);
  const comparing = compareIds.includes(course.id);
  const reason = result.reasons[0];

  return (
    <Card padded={false} onPress={() => router.push(`/course/${course.id}`)}>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 5, backgroundColor: statusColor, borderTopLeftRadius: radius.lg, borderBottomLeftRadius: radius.lg }} />
        <View style={{ flex: 1, padding: spacing.lg, gap: spacing.sm }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={6} style={{ flex: 1 }}>
              <Text variant="caption" tone="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>
                {FLAGS[course.country]}  {institution.name}
              </Text>
              {institution.verifiedPartner ? (
                <Ionicons name="shield-checkmark" size={13} color={colors.verified} />
              ) : null}
            </Row>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.save')}
              hitSlop={10}
              onPress={() => {
                hapticTap();
                toast(saved ? t('common.removedToast') : t('common.savedToast'));
                toggleSaved(course.id);
              }}
            >
              <Ionicons name={saved ? 'heart' : 'heart-outline'} size={20} color={saved ? colors.danger : colors.inkFaint} />
            </Pressable>
          </Row>

          <Text variant="sub" numberOfLines={2}>{course.name}</Text>
          <Text variant="caption" tone="faint">
            {t(`levels.${course.level}`)} · {t('common.years', { count: course.durationYears })} · {course.campusCity}
          </Text>

          <Text variant="bodyMedium" tone="accent">
            {formatDual(course.tuitionPerYear, course.currency, homeCurrency)}{' '}
            <Text variant="caption" tone="faint">{t('common.perYear')}</Text>
          </Text>

          {reason ? (
            <Row gap={5}>
              <Ionicons name="information-circle-outline" size={14} color={statusColor} />
              <Text variant="caption" color={statusColor} style={{ flex: 1 }} numberOfLines={2}>
                {t(reason.key, reason.params)}
              </Text>
            </Row>
          ) : null}

          <Row style={{ justifyContent: 'space-between', marginTop: 2 }}>
            <Badge
              tone={result.recognizedAtHome ? 'eligible' : 'danger'}
              icon={result.recognizedAtHome ? 'checkmark-circle' : 'alert-circle'}
              label={
                result.recognizedAtHome
                  ? t('match.recognized', { country: homeCountryLabel })
                  : t('match.notRecognized')
              }
            />
            {compareMode ? (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: comparing }}
                hitSlop={10}
                onPress={() => toggleCompare(course.id)}
              >
                <Row gap={5}>
                  <Ionicons
                    name={comparing ? 'checkbox' : 'square-outline'}
                    size={19}
                    color={comparing ? colors.accent : colors.inkFaint}
                  />
                  <Text variant="caption" tone={comparing ? 'accent' : 'faint'}>
                    {t('compare.title')}
                  </Text>
                </Row>
              </Pressable>
            ) : null}
          </Row>
        </View>
      </View>
    </Card>
  );
}

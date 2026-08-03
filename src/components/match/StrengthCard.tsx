import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { ProgressBar, Row } from '@/components/ui/Misc';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { unlockCountWithIelts } from '@/services/eligibility';
import type { MatchResult, StudentProfile } from '@/types/models';

export function StrengthCard({ profile, results }: { profile: StudentProfile; results: MatchResult[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const hasGrades = (profile.grades.subjects?.length ?? 0) > 0 || typeof profile.grades.total === 'number';
  const hasEnglish = profile.english.test !== 'none';
  const strength = 0.35 + (hasGrades ? 0.25 : 0) + (hasEnglish ? 0.4 : 0);

  const unlockable = unlockCountWithIelts(results, 6.5);
  const insight = !hasEnglish && unlockable > 0
    ? t('match.strengthUnlock', { score: '6.5', count: unlockable })
    : hasEnglish
      ? t('match.strengthEnglishDone', {
          test: profile.english.test === 'ielts' ? t('onboarding.ielts') : t('onboarding.toefl'),
          score: profile.english.score,
        })
      : t('match.strengthComplete');

  return (
    <Card tone="accent" style={{ gap: spacing.md }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="label" tone="accent">{t('match.strengthTitle')}</Text>
        <Text variant="label" tone="accent">{Math.round(strength * 100)}%</Text>
      </Row>
      <ProgressBar value={strength} />
      <Row gap={spacing.sm}>
        <Ionicons name={hasEnglish ? 'checkmark-circle' : 'key-outline'} size={18} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text variant="caption" tone="secondary">{insight}</Text>
        </View>
      </Row>
    </Card>
  );
}

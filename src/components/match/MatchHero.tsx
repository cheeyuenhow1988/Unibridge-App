import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Row } from '@/components/ui/Misc';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { unlockCountWithIelts } from '@/services/eligibility';
import type { MatchResult, StudentProfile } from '@/types/models';

interface Props {
  profile: StudentProfile;
  results: MatchResult[];
  matchedCount: number;
}

/** Gradient statement card: greeting, match count and the profile-strength meter. */
export function MatchHero({ profile, results, matchedCount }: Props) {
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
    <LinearGradient
      colors={[colors.gradientFrom, colors.gradientTo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md }}
    >
      <Text variant="hero" color={colors.onGradient} style={{ fontSize: 34, lineHeight: 38 }}>
        {t('match.greeting', { name: profile.name.split(' ')[0] })}
      </Text>
      <Text variant="body" color={colors.onGradientSoft}>
        {t('match.subtitle', { count: matchedCount, system: profile.qualification.toUpperCase() })}
      </Text>

      <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text variant="micro" color={colors.pop} style={{ letterSpacing: 2 }}>
            {t('match.strengthTitle').toUpperCase()}
          </Text>
          <Text variant="label" color={colors.pop}>{Math.round(strength * 100)}%</Text>
        </Row>
        <View style={{ height: 9, borderRadius: radius.full, backgroundColor: colors.gradientTrack, overflow: 'hidden' }}>
          <View
            style={{
              width: `${Math.min(100, Math.max(0, strength * 100))}%`,
              height: '100%',
              borderRadius: radius.full,
              backgroundColor: colors.pop,
            }}
          />
        </View>
        <Row gap={spacing.sm}>
          <Ionicons name={hasEnglish ? 'checkmark-circle' : 'key-outline'} size={16} color={colors.pop} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.onGradientSoft}>{insight}</Text>
          </View>
        </Row>
      </View>
    </LinearGradient>
  );
}

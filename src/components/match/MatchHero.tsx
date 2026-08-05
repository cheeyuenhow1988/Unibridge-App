import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Row } from '@/components/ui/Misc';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { unlockCountWithIelts } from '@/services/eligibility';
import { useVaultStore } from '@/store/useVaultStore';
import type { DocumentTypeId, MatchResult, StudentProfile } from '@/types/models';

const CORE_DOCS: DocumentTypeId[] = ['transcript', 'certificate', 'passport', 'english', 'statement', 'financial'];

interface Props {
  profile: StudentProfile;
  results: MatchResult[];
  matchedCount: number;
}

/** Gradient statement card: greeting, match count and the profile-strength meter. */
export function MatchHero({ profile, results, matchedCount }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const documents = useVaultStore((s) => s.documents);
  const hasGrades = (profile.grades.subjects?.length ?? 0) > 0 || typeof profile.grades.total === 'number';
  const hasEnglish = profile.english.test !== 'none';
  const strength = 0.35 + (hasGrades ? 0.25 : 0) + (hasEnglish ? 0.4 : 0);

  const missingDocs = CORE_DOCS.filter((d) => !documents.some((x) => x.type === d)).length;
  const unlockable = unlockCountWithIelts(results, 6.5);

  // At full strength the meter hands over to the next-best action instead of
  // dead-ending in praise: vault gaps are what block the first application.
  const docsAction = hasGrades && hasEnglish && missingDocs > 0;
  const englishAction = !hasEnglish && unlockable > 0;
  const insight = !hasEnglish && unlockable > 0
    ? t('match.strengthUnlock', { score: '6.5', count: unlockable })
    : docsAction
      ? t('match.strengthDocs', { count: missingDocs })
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
      style={{ borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md, overflow: 'hidden' }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute', top: -46, right: -34, width: 170, height: 170,
          borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.08)',
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute', bottom: -58, left: -42, width: 150, height: 150,
          borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.05)',
        }}
      />
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
        <Pressable
          accessibilityRole={docsAction || englishAction ? 'button' : undefined}
          onPress={
            docsAction
              ? () => router.push('/vault')
              : englishAction
                ? () => router.push('/onboarding/grades')
                : undefined
          }
          disabled={!docsAction && !englishAction}
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        >
          <Row gap={spacing.sm}>
            <Ionicons
              name={docsAction ? 'folder-open-outline' : hasEnglish ? 'checkmark-circle' : 'key-outline'}
              size={16}
              color={colors.pop}
            />
            <View style={{ flex: 1 }}>
              <Text variant="caption" color={colors.onGradientSoft}>{insight}</Text>
            </View>
            {docsAction || englishAction ? <Ionicons name="chevron-forward" size={14} color={colors.pop} /> : null}
          </Row>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

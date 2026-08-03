import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { AmbassadorStrip } from '@/components/explore/AmbassadorStrip';
import { AttractionsCarousel } from '@/components/explore/AttractionsCarousel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Row, SectionHeader } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { FLAGS } from '@/constants/countries';
import { radius, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useTheme } from '@/hooks/useTheme';
import { useWikiImage } from '@/hooks/useWikiImage';
import { getInstitution, listCoursesByInstitution } from '@/services/api';
import { formatDual, homeCurrencyFor } from '@/services/currency';
import { useProfileStore } from '@/store/useProfileStore';

export default function InstitutionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const profile = useProfileStore((s) => s.profile);
  const home = profile ? homeCurrencyFor(profile) : 'USD';

  const state = useAsync(
    async () => Promise.all([getInstitution(id), listCoursesByInstitution(id)]),
    [id],
  );
  const wikiImage = useWikiImage(state.data?.[0]?.wikipedia ?? '');

  if (state.loading) {
    return (
      <Screen edges={['top', 'bottom']}>
        <SkeletonCards count={3} height={160} />
      </Screen>
    );
  }
  const institution = state.data?.[0];
  if (state.error || !institution) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ErrorState onRetry={state.retry} />
      </Screen>
    );
  }
  const courses = state.data?.[1] ?? [];

  return (
    <Screen padded={false} edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
        <View>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {(wikiImage ? [wikiImage, ...institution.images.slice(1)] : institution.images).map((img) => (
              <Image key={img} source={{ uri: img }} style={{ width, height: 240 }} contentFit="cover" transition={250} />
            ))}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={() => router.back()}
            style={{
              position: 'absolute', top: 54, left: spacing.lg, width: 40, height: 40,
              borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
        </View>

        <View style={{ padding: spacing.lg, gap: spacing.lg }}>
          <View style={{ gap: spacing.sm }}>
            <Row gap={spacing.sm} wrap>
              {institution.verifiedPartner ? (
                <Badge tone="verified" icon="shield-checkmark" label={t('common.verifiedPartner')} />
              ) : null}
              {institution.ranking ? (
                <Badge tone="accent" icon="podium-outline" label={t('institution.rankingShort', { rank: institution.ranking })} />
              ) : null}
            </Row>
            <Row gap={spacing.md}>
              <Image
                source={{ uri: institution.logo }}
                style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#FFFFFF' }}
                contentFit="contain"
              />
              <Text variant="title" style={{ flex: 1 }}>{institution.name}</Text>
            </Row>
            <Text variant="body" tone="secondary">{institution.tagline}</Text>
            <Text variant="caption" tone="faint">
              {FLAGS[institution.country]}  {t('institution.cityCountry', { city: institution.city, country: t(`countries.${institution.country}`) })} · {t(`instTypes.${institution.type}`)}
            </Text>
            <Row gap={spacing.lg} wrap>
              <Text variant="caption" tone="secondary">{t('institution.founded', { year: institution.founded })}</Text>
              <Text variant="caption" tone="secondary">
                {t('institution.students', { count: institution.students.toLocaleString('en') })}
              </Text>
            </Row>
            <Row gap={6}>
              <Ionicons name="language-outline" size={14} color={colors.accent} />
              <Text variant="caption" tone="secondary">
                {t('institution.teachingLanguage')}: {institution.languages.join(' · ')}
              </Text>
            </Row>
          </View>

          <Row gap={spacing.sm} wrap>
            <Button
              label={t('institution.website')}
              icon="globe-outline"
              variant="secondary"
              size="sm"
              onPress={() => void Linking.openURL(institution.website)}
            />
            <Button
              label={t('course.askQuestion')}
              icon="chatbubble-ellipses-outline"
              size="sm"
              onPress={() => router.push(`/chat/${institution.id}`)}
            />
          </Row>
          <Row gap={spacing.sm} wrap>
            {([
              ['logo-whatsapp', 'WhatsApp'],
              ['paper-plane-outline', 'Telegram'],
              ['logo-facebook', 'Facebook'],
            ] as const).map(([icon, label]) => (
              <Pressable
                key={label}
                accessibilityRole="button"
                accessibilityLabel={`${label} — ${t('common.comingSoon')}`}
                onPress={() =>
                  Alert.alert(`${label} — ${t('common.comingSoon')}`, t('institution.socialNote'), [
                    { text: t('common.close'), style: 'cancel' },
                    { text: t('course.askQuestion'), onPress: () => router.push(`/chat/${institution.id}`) },
                  ])
                }
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
                  backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing.md, minHeight: 36,
                  opacity: pressed ? 0.7 : 0.9,
                })}
              >
                <Ionicons name={icon} size={15} color={colors.inkFaint} />
                <Text variant="caption" tone="faint">{label} · {t('common.soon')}</Text>
              </Pressable>
            ))}
          </Row>

          <Text variant="caption" tone="faint">{t('institution.indicative')}</Text>

          <SectionHeader title={t('institution.coursesTitle')} />
          <View style={{ gap: spacing.md }}>
            {courses.map((course) => (
              <Card key={course.id} onPress={() => router.push(`/course/${course.id}`)} style={{ gap: spacing.xs }}>
                <Text variant="sub" numberOfLines={2}>{course.name}</Text>
                <Text variant="caption" tone="faint">
                  {t(`levels.${course.level}`)} · {t('common.years', { count: course.durationYears })} · {t(`fields.${course.field}`)}
                </Text>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text variant="bodyMedium" tone="accent">
                    {formatDual(course.tuitionPerYear, course.currency, home)}{' '}
                    <Text variant="caption" tone="faint">{t('common.perYear')}</Text>
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
                </Row>
              </Card>
            ))}
          </View>

          <SectionHeader title={t('institution.studentsHere')} />
          <AmbassadorStrip institutionId={institution.id} />

          <SectionHeader title={t('institution.aroundCampus')} />
          <AttractionsCarousel institutionId={institution.id} city={institution.city} />
        </View>
      </ScrollView>
    </Screen>
  );
}

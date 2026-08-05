import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { AmbassadorStrip } from '@/components/explore/AmbassadorStrip';
import { AttractionsCarousel } from '@/components/explore/AttractionsCarousel';
import { InstLogo } from '@/components/explore/InstLogo';
import { ScholarshipCard } from '@/components/explore/ScholarshipCard';
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
import { getInstitution, getSchoolReviews, listCoursesByInstitution, listScholarships } from '@/services/api';
import { formatDual, homeCurrencyFor } from '@/services/currency';
import { useProfileStore } from '@/store/useProfileStore';
import type { QualificationId } from '@/types/models';

/** Vintage of the generated dataset, shown on the freshness note. */
const DATA_CHECKED = '2026-08';

const QUAL_LABEL: Record<QualificationId, string> = {
  spm: 'SPM', stpm: 'STPM', uec: 'UEC', alevels: 'A-Levels', ib: 'IB',
  hkdse: 'HKDSE', gsat: 'GSAT', atar: 'ATAR', gpa: 'GPA',
  sma: 'SMA', thpt: 'THPT', gaokao: 'Gaokao', matric: 'Matric', krgpa: 'GPA (KR)', jpgpa: '評定 (JP)',
};

export default function InstitutionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const profile = useProfileStore((s) => s.profile);
  const home = profile ? homeCurrencyFor(profile) : 'USD';

  const state = useAsync(
    async () => Promise.all([getInstitution(id), listCoursesByInstitution(id), listScholarships()]),
    [id],
  );
  const reviews = useAsync(() => getSchoolReviews(id), [id]);
  const [photoIdx, setPhotoIdx] = useState(0);
  const galleryRef = useRef<ScrollView>(null);

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

  // Scholarships this school offers itself, then country-wide ones students
  // here can also use.
  const allScholarships = state.data?.[2] ?? [];
  const ownScholarships = allScholarships.filter((s) => s.provider === institution.name);
  const countryScholarships = allScholarships
    .filter((s) => s.provider !== institution.name && s.destinationCountry === institution.country)
    .slice(0, 2);

  // Honest requirements summary across this school's courses.
  const qual = profile?.qualification;
  const ielts = courses.map((c) => c.english.ielts);
  const ieltsMin = ielts.length ? Math.min(...ielts) : null;
  const ieltsMax = ielts.length ? Math.max(...ielts) : null;
  const easiest = qual && courses.length
    ? [...courses].sort((a, b) => a.selectivity - b.selectivity)[0]
    : undefined;

  return (
    <Screen padded={false} edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
        <View>
          <ScrollView
            ref={galleryRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setPhotoIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
          >
            {institution.images.map((img) => (
              <Image key={img} source={{ uri: img }} style={{ width, height: 240 }} contentFit="cover" transition={250} />
            ))}
          </ScrollView>
          {/* Swiping doesn't exist on desktop web — arrows are the only way
              through the gallery there, so drive the index from the press. */}
          {institution.images.length > 1 && photoIdx > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('institution.prevPhoto')}
              onPress={() => {
                const next = Math.max(0, photoIdx - 1);
                galleryRef.current?.scrollTo({ x: next * width, animated: true });
                setPhotoIdx(next);
              }}
              style={{
                position: 'absolute', left: spacing.md, top: 120 - 18, width: 36, height: 36,
                borderRadius: radius.full, backgroundColor: 'rgba(0,0,0,0.45)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </Pressable>
          ) : null}
          {institution.images.length > 1 && photoIdx < institution.images.length - 1 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('institution.nextPhoto')}
              onPress={() => {
                const next = Math.min(institution.images.length - 1, photoIdx + 1);
                galleryRef.current?.scrollTo({ x: next * width, animated: true });
                setPhotoIdx(next);
              }}
              style={{
                position: 'absolute', right: spacing.md, top: 120 - 18, width: 36, height: 36,
                borderRadius: radius.full, backgroundColor: 'rgba(0,0,0,0.45)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </Pressable>
          ) : null}
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'transparent']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 110 }}
            pointerEvents="none"
          />
          {institution.images.length > 1 ? (
            <View
              style={{
                position: 'absolute', bottom: 10, right: spacing.lg, backgroundColor: 'rgba(0,0,0,0.55)',
                borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3,
              }}
            >
              <Text variant="caption" color="#FFFFFF">
                {Math.min(photoIdx + 1, institution.images.length)}/{institution.images.length} · {t('institution.photosCredit')}
              </Text>
            </View>
          ) : null}
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
              <InstLogo institution={institution} size={44} radius={10} />
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
              label={t('institution.knowMore')}
              icon="book-outline"
              variant="secondary"
              size="sm"
              onPress={() => void Linking.openURL(institution.wikipedia)}
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

          <SectionHeader title={t('institution.reqTitle')} />
          <Card style={{ gap: spacing.sm }}>
            {ieltsMin !== null ? (
              <Row style={{ justifyContent: 'space-between' }}>
                <Text variant="caption" tone="secondary">{t('institution.reqEnglish')}</Text>
                <Text variant="caption">
                  IELTS {ieltsMin === ieltsMax ? ieltsMin : `${ieltsMin}–${ieltsMax}`}
                </Text>
              </Row>
            ) : null}
            {qual && easiest ? (
              <Row style={{ justifyContent: 'space-between' }}>
                <Text variant="caption" tone="secondary">
                  {t('institution.reqYourQual', { qual: QUAL_LABEL[qual] })}
                </Text>
                <Text variant="caption">
                  {t('institution.reqFrom', { display: easiest.requirements[qual].display })}
                </Text>
              </Row>
            ) : null}
            <Text variant="caption" tone="faint">{t('institution.reqVary')}</Text>
            <Row gap={6}>
              <Ionicons name="time-outline" size={13} color={colors.eligible} />
              <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
                {t('institution.dataChecked', { date: DATA_CHECKED })}
              </Text>
            </Row>
          </Card>

          <SectionHeader title={t('institution.scholarshipsTitle')} />
          {ownScholarships.length === 0 && countryScholarships.length === 0 ? (
            <Card tone="alt">
              <Text variant="caption" tone="secondary">{t('institution.scholarshipsNone')}</Text>
            </Card>
          ) : (
            <View style={{ gap: spacing.md }}>
              {ownScholarships.map((s) => (
                <ScholarshipCard key={s.id} scholarship={s} />
              ))}
              {countryScholarships.length > 0 ? (
                <Text variant="caption" tone="faint">{t('institution.scholarshipsCountry')}</Text>
              ) : null}
              {countryScholarships.map((s) => (
                <ScholarshipCard key={s.id} scholarship={s} />
              ))}
              <Text variant="caption" tone="faint">
                {t('institution.dataChecked', { date: DATA_CHECKED })}
              </Text>
            </View>
          )}

          <SectionHeader title={t('institution.reviewsTitle')} />
          {reviews.data ? (
            <Card style={{ gap: spacing.md }}>
              <Row gap={spacing.md}>
                <Text variant="display" tone="accent">{reviews.data.rating.toFixed(1)}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Row gap={2}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Ionicons
                        key={n}
                        name={reviews.data!.rating >= n - 0.25 ? 'star' : reviews.data!.rating >= n - 0.75 ? 'star-half' : 'star-outline'}
                        size={16}
                        color="#F2A93B"
                      />
                    ))}
                  </Row>
                  <Text variant="caption" tone="faint">
                    {t('institution.reviewsCount', { count: reviews.data.count })}
                  </Text>
                </View>
              </Row>
              {reviews.data.reviews.map((r) => (
                <View key={r.author + r.date} style={{ gap: 3, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Row gap={6}>
                      <Text variant="label">{r.author}</Text>
                      <Text variant="caption" tone="faint">{FLAGS[r.homeCountry]}</Text>
                    </Row>
                    <Row gap={1}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Ionicons key={n} name={n <= r.stars ? 'star' : 'star-outline'} size={12} color="#F2A93B" />
                      ))}
                    </Row>
                  </Row>
                  <Text variant="caption" tone="secondary">{r.text}</Text>
                  {r.photos?.length ? (
                    <Row gap={spacing.sm} style={{ marginTop: spacing.xs }}>
                      {r.photos.map((p) => (
                        <Image
                          key={p}
                          source={{ uri: p }}
                          style={{ width: 84, height: 62, borderRadius: radius.md }}
                          contentFit="cover"
                          transition={200}
                        />
                      ))}
                    </Row>
                  ) : null}
                  <Text variant="micro" tone="faint">{r.date} · {t('institution.reviewsSampleTag')}</Text>
                </View>
              ))}
              <Button
                label={t('institution.reviewsOnGoogle')}
                icon="logo-google"
                variant="secondary"
                size="sm"
                onPress={() =>
                  void Linking.openURL(
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${institution.name} ${institution.city}`)}`,
                  )
                }
              />
              <Text variant="caption" tone="faint">{t('institution.reviewsSampleNote')}</Text>
            </Card>
          ) : null}

          {institution.campuses?.length ? (
            <>
              <SectionHeader title={t('institution.otherCampuses')} />
              <View style={{ gap: spacing.md }}>
                {institution.campuses.map((c) => (
                  <Card key={c.id} onPress={() => router.push(`/institution/${c.id}`)} style={{ gap: 4 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Row gap={spacing.sm} style={{ flex: 1 }}>
                        <Ionicons name="git-branch-outline" size={18} color={colors.accent} />
                        <View style={{ flex: 1 }}>
                          <Text variant="sub" numberOfLines={1}>{c.name}</Text>
                          <Text variant="caption" tone="secondary">
                            {FLAGS[c.country]} {c.city}, {t(`countries.${c.country}`)}
                          </Text>
                        </View>
                      </Row>
                      <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
                    </Row>
                    <Text variant="caption" tone="accent">{t('institution.campusFeesNote')}</Text>
                  </Card>
                ))}
              </View>
            </>
          ) : null}

          <SectionHeader title={t('institution.coursesTitle')} />
          <View style={{ gap: spacing.md }}>
            {courses.map((course) => (
              <Card key={course.id} onPress={() => router.push(`/course/${course.id}`)} style={{ gap: spacing.xs }}>
                <Text variant="sub" numberOfLines={2}>{course.name}</Text>
                <Text variant="caption" tone="faint">
                  {t(`levels.${course.level}`)} · {t('common.years', { count: course.durationYears })} · {t(`fields.${course.field}`)}
                </Text>
                {qual ? (
                  <Text variant="caption" tone="secondary">
                    {QUAL_LABEL[qual]}: {course.requirements[qual].display} · IELTS {course.english.ielts}
                  </Text>
                ) : null}
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

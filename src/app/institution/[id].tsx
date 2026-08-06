import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '@/services/nav';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
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
import { getInstitution, getSchoolReviews, listCoursesByInstitution, listFoodNearby, listScholarships } from '@/services/api';
import { formatDual, homeCurrencyFor } from '@/services/currency';
import { useProfileStore } from '@/store/useProfileStore';
import { toast } from '@/store/useToastStore';
import type { QualificationId } from '@/types/models';

/** Vintage of the generated dataset, shown on the freshness note. */
const DATA_CHECKED = '2026-08';

const QUAL_LABEL: Record<QualificationId, string> = {
  spm: 'SPM', stpm: 'STPM', uec: 'UEC', alevels: 'A-Levels', ib: 'IB',
  hkdse: 'HKDSE', gsat: 'GSAT', atar: 'ATAR', gpa: 'GPA',
  sma: 'SMA', thpt: 'THPT', gaokao: 'Gaokao', cbse: 'CBSE', shs: 'GWA', matric: 'Matric', krgpa: 'GPA (KR)', jpgpa: '評定 (JP)',
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
  const eats = useAsync(() => listFoodNearby(id), [id]);
  const [photoIdx, setPhotoIdx] = useState(0);
  // Photos whose download failed — swapped for a neutral tile instead of a
  // black void (Commons can be slow or blocked on some networks).
  const [badImgs, setBadImgs] = useState<string[]>([]);
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
            {institution.images.map((img, idx) => {
              const markBad = () => setBadImgs((b) => (b.includes(img) ? b : [...b, img]));
              return (
                <View key={img} style={{ width, height: 280, overflow: 'hidden', backgroundColor: colors.surfaceAlt }}>
                  {badImgs.includes(img) ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
                      <Ionicons name="image-outline" size={36} color={colors.inkFaint} />
                      <Text variant="caption" tone="faint">{t('institution.photoUnavailable')}</Text>
                    </View>
                  ) : idx === 0 ? (
                    // The audited hero is a proper wide shot — full-bleed cover.
                    <Image source={{ uri: img }} style={{ width, height: 280 }} contentFit="cover" transition={250} onError={markBad} />
                  ) : (
                    // Facility/detail shots vary wildly in shape; show them whole
                    // on a blurred backdrop instead of an ugly zoomed crop.
                    <>
                      <Image
                        source={{ uri: img }}
                        style={{ position: 'absolute', top: -24, left: -24, width: width + 48, height: 328 }}
                        contentFit="cover"
                        blurRadius={24}
                        transition={0}
                      />
                      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(7,13,34,0.35)' }} />
                      <Image source={{ uri: img }} style={{ width, height: 280 }} contentFit="contain" transition={250} onError={markBad} />
                    </>
                  )}
                </View>
              );
            })}
          </ScrollView>
          {/* Swiping doesn't exist on desktop web — arrows are the only way
              through the gallery there, so drive the index from the press. */}
          {institution.images.length > 1 ? (
            // One tidy control cluster at the bottom-left, clear of the back
            // button — arrows dim at each end instead of jumping around.
            <Row gap={spacing.sm} style={{ position: 'absolute', bottom: 10, left: spacing.lg }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('institution.prevPhoto')}
                disabled={photoIdx === 0}
                onPress={() => {
                  const next = Math.max(0, photoIdx - 1);
                  galleryRef.current?.scrollTo({ x: next * width, animated: true });
                  setPhotoIdx(next);
                }}
                style={{
                  width: 34, height: 34, borderRadius: radius.full, backgroundColor: 'rgba(0,0,0,0.55)',
                  alignItems: 'center', justifyContent: 'center', opacity: photoIdx === 0 ? 0.35 : 1,
                }}
              >
                <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('institution.nextPhoto')}
                disabled={photoIdx >= institution.images.length - 1}
                onPress={() => {
                  const next = Math.min(institution.images.length - 1, photoIdx + 1);
                  galleryRef.current?.scrollTo({ x: next * width, animated: true });
                  setPhotoIdx(next);
                }}
                style={{
                  width: 34, height: 34, borderRadius: radius.full, backgroundColor: 'rgba(0,0,0,0.55)',
                  alignItems: 'center', justifyContent: 'center',
                  opacity: photoIdx >= institution.images.length - 1 ? 0.35 : 1,
                }}
              >
                <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
              </Pressable>
            </Row>
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
            onPress={() => goBack('/explore')}
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
              label={t('institution.contactSchool')}
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
                onPress={() => toast(`${label} — ${t('common.comingSoon')}. ${t('institution.socialNote')}`)}
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

          {eats.data?.length ? (
            <>
              <SectionHeader title={t('institution.foodTitle')} />
              <Card style={{ gap: spacing.md }}>
                {eats.data.map((f) => (
                  <View key={f.id} style={{ gap: 3 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Text variant="label" style={{ flex: 1 }}>{f.name}</Text>
                      {f.rating ? (
                        <Row gap={3}>
                          <Ionicons name="star" size={13} color="#F2A93B" />
                          <Text variant="caption">
                            {f.rating.toFixed(1)}{f.reviewCount ? ` (${f.reviewCount.toLocaleString('en')})` : ''}
                          </Text>
                        </Row>
                      ) : null}
                    </Row>
                    <Text variant="caption" tone="secondary">
                      {t('institution.foodMins', { count: f.distanceMinutes })} · {f.description}
                    </Text>
                    {f.reviewSnippet ? (
                      <Text variant="caption" tone="faint">
                        “{f.reviewSnippet}” · {t('institution.reviewsSampleTag')}
                      </Text>
                    ) : null}
                    {f.photos?.length ? (
                      <Row gap={spacing.sm} style={{ marginTop: 2 }}>
                        {f.photos.slice(0, 2).map((p) => (
                          <Image
                            key={p}
                            source={{ uri: p }}
                            style={{ width: 110, height: 78, borderRadius: radius.md, backgroundColor: colors.surfaceAlt }}
                            contentFit="cover"
                            transition={200}
                          />
                        ))}
                      </Row>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        void Linking.openURL(
                          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${f.name} ${institution.city}`)}`,
                        )
                      }
                    >
                      <Row gap={4}>
                        <Ionicons name="logo-google" size={12} color={colors.accent} />
                        <Text variant="caption" tone="accent">{t('institution.reviewsOnGoogle')}</Text>
                      </Row>
                    </Pressable>
                  </View>
                ))}
                <Text variant="caption" tone="faint">{t('institution.foodSampleNote')}</Text>
              </Card>
            </>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

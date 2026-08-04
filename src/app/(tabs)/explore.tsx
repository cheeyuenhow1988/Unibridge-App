import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, View } from 'react-native';
import { InstitutionCard } from '@/components/explore/InstitutionCard';
import { ScholarshipCard } from '@/components/explore/ScholarshipCard';
import { Chip } from '@/components/ui/Chip';
import { Row } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { Card } from '@/components/ui/Card';
import { HCarousel } from '@/components/ui/HCarousel';
import { DEST_COUNTRIES, FLAGS } from '@/constants/countries';
import { spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useMatchData } from '@/hooks/useMatchData';
import { listInstitutions, listScholarships } from '@/services/api';
import { formatDual, homeCurrencyFor } from '@/services/currency';
import { useProfileStore } from '@/store/useProfileStore';
import { useSavedStore } from '@/store/useSavedStore';
import type { CountryCode, Institution, InstitutionType } from '@/types/models';
import { router } from 'expo-router';

type Segment = 'institutions' | 'scholarships' | 'saved';

// The directory never mixes everything together: it is grouped by country,
// and inside each country by kind — universities, then colleges, institutes.
const TYPE_ORDER: InstitutionType[] = ['university', 'college', 'institute'];
type ExploreRow =
  | { kind: 'country'; key: string; country: CountryCode; count: number }
  | { kind: 'type'; key: string; type: InstitutionType; count: number }
  | { kind: 'inst'; key: string; institution: Institution };

export default function ExploreScreen() {
  const { t } = useTranslation();
  const profile = useProfileStore((s) => s.profile);
  const [segment, setSegment] = useState<Segment>('institutions');
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState<CountryCode | null>(null);

  const inst = useAsync(listInstitutions);
  const sch = useAsync(listScholarships);
  const savedCourseIds = useSavedStore((s) => s.savedCourseIds);
  const { matchData } = useMatchData();
  const home = profile ? homeCurrencyFor(profile) : 'USD';
  const savedCourses = savedCourseIds
    .map((id) => matchData?.resultByCourseId.get(id))
    .filter((r): r is NonNullable<typeof r> => !!r);

  const filteredInstitutions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (inst.data ?? []).filter(
      (i) =>
        (!country || i.country === country) &&
        (!q ||
          i.name.toLowerCase().includes(q) ||
          i.city.toLowerCase().includes(q) ||
          // Specialization search: "marketing" finds every institution offering it.
          (matchData?.results.some(
            (r) => r.course.institutionId === i.id && r.course.name.toLowerCase().includes(q),
          ) ?? false)),
    );
  }, [inst.data, query, country, matchData]);

  const rows = useMemo(() => {
    const out: ExploreRow[] = [];
    for (const c of DEST_COUNTRIES) {
      const inCountry = filteredInstitutions.filter((i) => i.country === c);
      if (inCountry.length === 0) continue;
      out.push({ kind: 'country', key: `c-${c}`, country: c, count: inCountry.length });
      for (const ty of TYPE_ORDER) {
        const ofType = inCountry
          .filter((i) => i.type === ty)
          .sort((a, b) => (a.ranking ?? 9999) - (b.ranking ?? 9999) || a.name.localeCompare(b.name));
        if (ofType.length === 0) continue;
        out.push({ kind: 'type', key: `t-${c}-${ty}`, type: ty, count: ofType.length });
        ofType.forEach((i) => out.push({ kind: 'inst', key: i.id, institution: i }));
      }
    }
    return out;
  }, [filteredInstitutions]);

  const filteredScholarships = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (sch.data ?? [])
      .filter((s) => {
        if (country && s.destinationCountry !== 'any' && s.destinationCountry !== country) return false;
        if (
          profile &&
          s.nationalities !== 'any' &&
          !s.nationalities.includes(profile.nationality)
        ) return false;
        if (q && !`${s.name} ${s.provider}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => a.deadline.localeCompare(b.deadline));
  }, [sch.data, query, country, profile]);

  const active = segment === 'institutions' ? inst : sch;

  return (
    <Screen padded={false}>
      <FlatList<ExploreRow>
        data={segment === 'institutions' ? rows : []}
        keyExtractor={(r) => r.key}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => {
          if (item.kind === 'country') {
            return (
              <Row gap={spacing.sm} style={{ paddingTop: spacing.lg }}>
                <Text variant="title">{FLAGS[item.country]}</Text>
                <Text variant="title" style={{ flex: 1 }}>{t(`countries.${item.country}`)}</Text>
                <Text variant="caption" tone="faint">{item.count}</Text>
              </Row>
            );
          }
          if (item.kind === 'type') {
            return (
              <Text variant="label" tone="accent">
                {t(`instTypesPlural.${item.type}`)} · {item.count}
              </Text>
            );
          }
          return <InstitutionCard institution={item.institution} />;
        }}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.lg }}>
            <Text variant="display">{t('tabs.explore')}</Text>
            <Row gap={spacing.sm} wrap>
              <Chip
                label={t('tabs.explore')}
                selected={segment === 'institutions'}
                onPress={() => setSegment('institutions')}
              />
              <Chip
                label={t('scholarships.title')}
                selected={segment === 'scholarships'}
                onPress={() => setSegment('scholarships')}
              />
              <Chip
                label={`${t('common.saved')}${savedCourseIds.length ? ` · ${savedCourseIds.length}` : ''}`}
                selected={segment === 'saved'}
                onPress={() => setSegment('saved')}
              />
            </Row>
            {segment !== 'saved' ? (
              <>
                <TextField
                  placeholder={segment === 'scholarships' ? t('scholarships.searchPlaceholder') : t('common.search')}
                  value={query}
                  onChangeText={setQuery}
                  autoCorrect={false}
                />
                <HCarousel step={240}>
                  {DEST_COUNTRIES.map((c) => (
                    <Chip
                      key={c}
                      small
                      label={`${FLAGS[c]} ${t(`countries.${c}`)}`}
                      selected={country === c}
                      onPress={() => setCountry(country === c ? null : c)}
                    />
                  ))}
                </HCarousel>
              </>
            ) : null}
            {segment === 'saved' ? (
              <View style={{ gap: spacing.md }}>
                {savedCourses.map((r) => (
                  <Card key={r.course.id} onPress={() => router.push(`/course/${r.course.id}`)} style={{ gap: 4 }}>
                    <Text variant="caption" tone="secondary" numberOfLines={1}>
                      {FLAGS[r.course.country]} {r.institution.name}
                    </Text>
                    <Text variant="sub" numberOfLines={2}>{r.course.name}</Text>
                    <Text variant="caption" tone="accent">
                      {formatDual(r.course.tuitionPerYear, r.course.currency, home)} {t('common.perYear')}
                    </Text>
                  </Card>
                ))}
                {savedCourses.length === 0 ? (
                  <EmptyState icon="heart-outline" title={t('profile.savedEmpty')} />
                ) : null}
              </View>
            ) : null}
            {segment === 'scholarships' && profile ? (
              <Text variant="caption" tone="faint">
                {t('scholarships.forYou')} · {FLAGS[profile.nationality]} {t(`countries.${profile.nationality}`)}
              </Text>
            ) : null}
            {active.loading ? <SkeletonCards count={3} height={segment === 'institutions' ? 220 : 190} /> : null}
            {active.error ? <ErrorState onRetry={active.retry} /> : null}
            {segment === 'scholarships' && !sch.loading && !sch.error ? (
              <View style={{ gap: spacing.md }}>
                {filteredScholarships.map((s) => (
                  <ScholarshipCard key={s.id} scholarship={s} />
                ))}
                {filteredScholarships.length === 0 ? (
                  <EmptyState icon="ribbon-outline" title={t('scholarships.empty')} />
                ) : null}
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          segment === 'institutions' && !inst.loading && !inst.error ? (
            <EmptyState icon="business-outline" title={t('common.emptyTitle')} />
          ) : null
        }
      />
    </Screen>
  );
}

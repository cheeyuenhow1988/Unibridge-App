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
import { DEST_COUNTRIES, FLAGS } from '@/constants/countries';
import { spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { listInstitutions, listScholarships } from '@/services/api';
import { useProfileStore } from '@/store/useProfileStore';
import type { CountryCode } from '@/types/models';

type Segment = 'institutions' | 'scholarships';

export default function ExploreScreen() {
  const { t } = useTranslation();
  const profile = useProfileStore((s) => s.profile);
  const [segment, setSegment] = useState<Segment>('institutions');
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState<CountryCode | null>(null);

  const inst = useAsync(listInstitutions);
  const sch = useAsync(listScholarships);

  const filteredInstitutions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (inst.data ?? []).filter(
      (i) =>
        (!country || i.country === country) &&
        (!q || i.name.toLowerCase().includes(q) || i.city.toLowerCase().includes(q)),
    );
  }, [inst.data, query, country]);

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
      <FlatList
        data={segment === 'institutions' ? filteredInstitutions : []}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => <InstitutionCard institution={item} />}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.lg }}>
            <Text variant="display">{t('tabs.explore')}</Text>
            <Row gap={spacing.sm}>
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
            </Row>
            <TextField
              placeholder={segment === 'scholarships' ? t('scholarships.searchPlaceholder') : t('common.search')}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={DEST_COUNTRIES}
              keyExtractor={(c) => c}
              contentContainerStyle={{ gap: spacing.sm }}
              renderItem={({ item: c }) => (
                <Chip
                  small
                  label={`${FLAGS[c]} ${t(`countries.${c}`)}`}
                  selected={country === c}
                  onPress={() => setCountry(country === c ? null : c)}
                />
              )}
            />
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

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Row, SectionHeader } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { FLAGS } from '@/constants/countries';
import { radius, spacing } from '@/constants/theme';
import { useMatchData } from '@/hooks/useMatchData';
import { useTheme } from '@/hooks/useTheme';
import { formatDual, homeCurrencyFor } from '@/services/currency';
import { loadDemoProfile } from '@/store/seedDemo';
import { useApplicationsStore } from '@/store/useApplicationsStore';
import { useCommunityStore } from '@/store/useCommunityStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useSavedStore } from '@/store/useSavedStore';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const profile = useProfileStore((s) => s.profile);
  const themePref = useProfileStore((s) => s.themePref);
  const setThemePref = useProfileStore((s) => s.setThemePref);
  const resetProfile = useProfileStore((s) => s.reset);
  const savedCourseIds = useSavedStore((s) => s.savedCourseIds);
  const { matchData } = useMatchData();

  if (!profile) return <Screen />;

  const home = homeCurrencyFor(profile.homeCountry);
  const initials = profile.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const saved = savedCourseIds
    .map((id) => matchData?.resultByCourseId.get(id))
    .filter((r): r is NonNullable<typeof r> => !!r);

  const resetAll = () => {
    Alert.alert(t('profile.resetApp'), t('profile.resetConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.resetApp'),
        style: 'destructive',
        onPress: () => {
          resetProfile();
          useSavedStore.setState({ savedCourseIds: [], savedScholarshipIds: [], compareIds: [] });
          useApplicationsStore.setState({ applications: [], notifications: [] });
          useCommunityStore.setState({ joinedGroupIds: [], localMessages: {}, connections: [], rsvps: [] });
          router.replace('/onboarding/welcome');
        },
      },
    ]);
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing.lg, paddingTop: spacing.xl }}>
          <Row gap={spacing.lg}>
            <View
              style={{
                width: 72, height: 72, borderRadius: radius.full, backgroundColor: colors.accent,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text variant="title" color={colors.onAccent}>{initials}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="title">{profile.name}</Text>
              <Text variant="caption" tone="secondary">
                {FLAGS[profile.homeCountry]} {t(`countries.${profile.homeCountry}`)} · {t('profile.homeCurrency')} {home}
              </Text>
              <Row gap={6} wrap>
                <Badge tone="accent" label={profile.qualification.toUpperCase()} />
                <Badge tone="neutral" label={`${t('profile.intakeYear')} ${profile.intakeYear}`} />
                <Badge
                  tone={profile.english.test === 'none' ? 'borderline' : 'eligible'}
                  label={
                    profile.english.test === 'none'
                      ? t('profile.noEnglish')
                      : `${profile.english.test.toUpperCase()} ${profile.english.score}`
                  }
                />
              </Row>
            </View>
          </Row>

          <Row gap={spacing.sm}>
            <Button
              label={t('profile.editProfile')}
              variant="secondary"
              size="sm"
              icon="person-outline"
              onPress={() => router.push('/onboarding/profile')}
              style={{ flex: 1 }}
            />
            <Button
              label={t('profile.editGrades')}
              variant="secondary"
              size="sm"
              icon="school-outline"
              onPress={() => router.push('/onboarding/grades')}
              style={{ flex: 1 }}
            />
          </Row>

          <Card onPress={() => router.push('/vault')} style={{ gap: 4 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={spacing.sm}>
                <Ionicons name="folder-open-outline" size={20} color={colors.accent} />
                <Text variant="label">{t('profile.documentVault')}</Text>
              </Row>
              <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
            </Row>
          </Card>

          <SectionHeader title={t('profile.savedCourses')} />
          {saved.length === 0 ? (
            <Text variant="caption" tone="faint">{t('profile.savedEmpty')}</Text>
          ) : (
            <View style={{ gap: spacing.md }}>
              {saved.map((r) => (
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
            </View>
          )}

          <SectionHeader title={t('profile.appearance')} />
          <Row gap={spacing.sm}>
            {(['system', 'light', 'dark'] as const).map((pref) => (
              <Chip
                key={pref}
                label={t(`profile.theme${pref[0]!.toUpperCase()}${pref.slice(1)}`)}
                selected={themePref === pref}
                onPress={() => setThemePref(pref)}
              />
            ))}
          </Row>

          <SectionHeader title={t('profile.language')} />
          <Row>
            <Chip label={t('profile.english_lang')} selected onPress={() => undefined} />
          </Row>

          <SectionHeader title={t('common.appName')} />
          <Button
            label={t('profile.loadDemo')}
            variant="secondary"
            icon="flask-outline"
            onPress={() => {
              void loadDemoProfile().then(() => router.replace('/(tabs)/match'));
            }}
          />
          <Button label={t('profile.resetApp')} variant="danger" icon="trash-outline" onPress={resetAll} />
          <Text variant="caption" tone="faint" center style={{ marginTop: spacing.md }}>
            {t('profile.about')}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

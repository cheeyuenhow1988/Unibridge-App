import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, Pressable, ScrollView, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { PickerField } from '@/components/ui/PickerField';
import { Row, SectionHeader } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { CURRENCY_SYMBOL, FLAGS } from '@/constants/countries';
import { radius, spacing } from '@/constants/theme';
import { BUILD_ID } from '@/constants/version';
import { useMatchData } from '@/hooks/useMatchData';
import { useTheme } from '@/hooks/useTheme';
import { ALL_CURRENCIES, formatDual, getRatesMeta, homeCurrencyFor } from '@/services/currency';
import { loadDemoProfile } from '@/store/seedDemo';
import type { CurrencyCode } from '@/types/models';
import { useApplicationsStore } from '@/store/useApplicationsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useCommunityStore } from '@/store/useCommunityStore';
import { useMailStore } from '@/store/useMailStore';
import { usePlanStore } from '@/store/usePlanStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useRewardsStore } from '@/store/useRewardsStore';
import { useSavedStore } from '@/store/useSavedStore';
import { useVaultStore } from '@/store/useVaultStore';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const profile = useProfileStore((s) => s.profile);
  const themePref = useProfileStore((s) => s.themePref);
  const setThemePref = useProfileStore((s) => s.setThemePref);
  const language = useProfileStore((s) => s.language);
  const setLanguage = useProfileStore((s) => s.setLanguage);
  const account = useAuthStore((s) => s.account);
  const signOut = useAuthStore((s) => s.signOut);
  const avatarUri = useProfileStore((s) => s.avatarUri);
  const setAvatar = useProfileStore((s) => s.setAvatar);
  const patchProfile = useProfileStore((s) => s.patchProfile);
  const resetProfile = useProfileStore((s) => s.reset);
  const savedCourseIds = useSavedStore((s) => s.savedCourseIds);
  const { matchData } = useMatchData();
  const coins = useRewardsStore((s) => s.coins);
  const plan = usePlanStore((s) => s.plan);
  const setPlanTo = usePlanStore((s) => s.setPlan);
  const applications = useApplicationsStore((s) => s.applications);
  const vaultDocs = useVaultStore((s) => s.documents);
  const [parentShareOpen, setParentShareOpen] = useState(false);
  const earnedCount =
    (profile ? 1 : 0) +
    (profile && (profile.grades.subjects?.length || profile.grades.total !== undefined) ? 1 : 0) +
    (vaultDocs.length >= 4 ? 1 : 0) +
    (applications.length > 0 ? 1 : 0) +
    (applications.some((a) => ['conditional_offer', 'offer', 'accepted', 'coe_issued'].includes(a.status)) ? 1 : 0) +
    (applications.some((a) => ['accepted', 'coe_issued'].includes(a.status)) ? 1 : 0);

  if (!profile) return <Screen />;

  const home = homeCurrencyFor(profile);
  const initials = profile.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const shareCode = 'UB-' + Array.from(profile.name).reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 46656, 7).toString(36).toUpperCase().padStart(3, '0') + '-' + String(profile.name.length * 7 % 100).padStart(2, '0');

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
          setAvatar(null);
          signOut();
          useSavedStore.setState({ savedCourseIds: [], savedScholarshipIds: [], compareIds: [] });
          useApplicationsStore.setState({ applications: [], notifications: [] });
          useCommunityStore.setState({ joinedGroupIds: [], localMessages: {}, connections: [], rsvps: [], likedPostIds: [] });
          useRewardsStore.getState().reset();
          useMailStore.getState().reset();
          usePlanStore.getState().reset();
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('profile.changePhoto')}
              onPress={async () => {
                const res = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ['images'],
                  allowsEditing: true,
                  aspect: [1, 1],
                  quality: 0.8,
                });
                const asset = res.assets?.[0];
                if (!res.canceled && asset) setAvatar(asset.uri);
              }}
            >
              <View
                style={{
                  width: 72, height: 72, borderRadius: radius.full, backgroundColor: colors.accent,
                  alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={{ width: 72, height: 72 }} contentFit="cover" />
                ) : (
                  <Text variant="title" color={colors.onAccent}>{initials}</Text>
                )}
              </View>
              <View
                style={{
                  position: 'absolute', bottom: -2, right: -2, width: 26, height: 26,
                  borderRadius: radius.full, backgroundColor: colors.surface,
                  borderWidth: 1, borderColor: colors.border,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name="camera-outline" size={14} color={colors.accent} />
              </View>
            </Pressable>
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

          <Card onPress={() => router.push('/(tabs)/assistant')} style={{ gap: 4 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={spacing.sm}>
                <Ionicons name="sparkles" size={20} color={colors.accent} />
                <Text variant="label">{t('assistant.title')}</Text>
              </Row>
              <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
            </Row>
          </Card>

          <Card onPress={() => router.push('/rewards')} style={{ gap: 4 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={spacing.sm}>
                <Ionicons name="trophy-outline" size={20} color={colors.accent} />
                <View>
                  <Text variant="label">{t('rewards.title')}</Text>
                  <Text variant="caption" tone="faint">🪙 {coins} · {t('rewards.badgesShort', { count: earnedCount })}</Text>
                </View>
              </Row>
              <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
            </Row>
          </Card>

          <SectionHeader title={t('safety.title')} />
          <Card onPress={() => router.push('/safety')} style={{ gap: 4 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={spacing.sm}>
                <Ionicons name="shield-checkmark" size={20} color="#0E7490" />
                <View>
                  <Text variant="label">{t('safety.title')}</Text>
                  <Text variant="caption" tone="faint">
                    {profile?.emergencyContact
                      ? t('safety.cardSubSet', { name: profile.emergencyContact.name })
                      : t('safety.cardSubUnset')}
                  </Text>
                </View>
              </Row>
              <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
            </Row>
          </Card>
          <Card onPress={() => setParentShareOpen(true)} style={{ gap: 4 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={spacing.sm}>
                <Ionicons name="people-circle-outline" size={20} color="#0E7490" />
                <View>
                  <Text variant="label">{t('parent.share')}</Text>
                  <Text variant="caption" tone="faint">{t('parent.shareSub')}</Text>
                </View>
              </Row>
              <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
            </Row>
          </Card>

          <SectionHeader title={t('pass.planTitle')} />
          <Row gap={spacing.sm}>
            <Chip label={t('pass.colFree')} selected={plan === 'free'} onPress={() => setPlanTo('free')} />
            <Chip label={t('pass.title')} selected={plan === 'season_pass'} onPress={() => setPlanTo('season_pass')} />
            <Chip label={t('pass.colVip')} selected={plan === 'vip'} onPress={() => setPlanTo('vip')} />
          </Row>
          <Card onPress={() => router.push('/pass')} style={{ gap: 4 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={spacing.sm}>
                <Ionicons name="key" size={20} color={colors.accent} />
                <View>
                  <Text variant="label">{t('pass.title')}</Text>
                  <Text variant="caption" tone="faint">
                    {plan !== 'free' ? t('pass.owned') : t('pass.headline')}
                  </Text>
                </View>
              </Row>
              <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
            </Row>
          </Card>

          <Card onPress={() => router.push('/vip')} style={{ gap: 4, borderColor: '#D9B45B', borderWidth: 1 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={spacing.sm}>
                <Ionicons name="diamond" size={20} color="#B8923B" />
                <View>
                  <Text variant="label">{t('vip.title')}</Text>
                  <Text variant="caption" tone="faint">{plan === 'vip' ? t('vip.owned') : t('vip.entrySub')}</Text>
                </View>
              </Row>
              <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
            </Row>
          </Card>

          <SectionHeader title={t('auth.account')} />
          {account ? (
            <Card style={{ gap: spacing.sm }}>
              <Row gap={spacing.md}>
                <Ionicons
                  name={account.provider === 'google' ? 'logo-google' : account.provider === 'apple' ? 'logo-apple' : 'mail-outline'}
                  size={18}
                  color={colors.accent}
                />
                <View style={{ flex: 1 }}>
                  <Text variant="label">{account.email}</Text>
                  <Text variant="caption" tone="faint">
                    {t(`auth.provider_${account.provider}`)} · {t('common.demo')}
                  </Text>
                </View>
              </Row>
              <Button
                label={t('auth.signOut')}
                variant="danger"
                size="sm"
                icon="log-out-outline"
                onPress={signOut}
                style={{ alignSelf: 'flex-start' }}
              />
            </Card>
          ) : (
            <Button
              label={t('auth.signInCta')}
              variant="secondary"
              icon="person-circle-outline"
              onPress={() => router.push('/onboarding/auth')}
            />
          )}

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

          <SectionHeader title={t('profile.currencyTitle')} />
          <PickerField
            value={profile.currency ?? 'auto'}
            options={[
              { value: 'auto', label: t('profile.currencyAuto', { currency: homeCurrencyFor({ homeCountry: profile.homeCountry }) }) },
              ...ALL_CURRENCIES.map((c) => ({ value: c, label: `${CURRENCY_SYMBOL[c]}  ${c}` })),
            ]}
            onChange={(v) => patchProfile({ currency: v === 'auto' ? undefined : (v as CurrencyCode) })}
          />
          <Text variant="caption" tone="faint">
            {t('profile.rates', { source: t(`profile.ratesSource_${getRatesMeta().source}`), asOf: getRatesMeta().asOf })}
          </Text>

          <SectionHeader title={t('profile.language')} />
          <Row gap={spacing.sm} wrap>
            {([
              ['en', 'English'],
              ['ms', 'Bahasa Melayu'],
              ['id', 'Bahasa Indonesia'],
              ['vi', 'Tiếng Việt'],
              ['zh', '中文（简体）'],
              ['zh-TW', '中文（繁體）'],
              ['th', 'ไทย'],
              ['hi', 'हिन्दी'],
              ['ja', '日本語'],
              ['ko', '한국어'],
            ] as const).map(([code, label]) => (
              <Chip key={code} label={label} selected={language === code} onPress={() => setLanguage(code)} />
            ))}
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
          <Text variant="caption" tone="faint" center>
            {t('profile.build', { id: BUILD_ID })}
          </Text>
        </View>
      </ScrollView>

      <Modal visible={parentShareOpen} animationType="fade" transparent onRequestClose={() => setParentShareOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.xl }} onPress={() => setParentShareOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{ backgroundColor: colors.bg, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md }}>
              <Row gap={spacing.sm}>
                <Ionicons name="people-circle-outline" size={22} color="#0E7490" />
                <Text variant="title">{t('parent.share')}</Text>
              </Row>
              <Text variant="body" tone="secondary">{t('parent.shareHint')}</Text>
              <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', gap: 2 }}>
                <Text variant="micro" tone="faint">{t('parent.shareCode').toUpperCase()}</Text>
                <Text variant="heading" tone="accent">{shareCode}</Text>
              </View>
              <Text variant="caption" tone="secondary">{t('parent.scopeNote')}</Text>
              <Button
                label={t('parent.viewDemo')}
                icon="eye-outline"
                variant="secondary"
                onPress={() => {
                  setParentShareOpen(false);
                  router.push('/parent');
                }}
              />
              <Text variant="caption" tone="faint" center>{t('safety.mockNote')}</Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

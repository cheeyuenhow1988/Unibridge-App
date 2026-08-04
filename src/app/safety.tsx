import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, View } from 'react-native';
import { SAFETY_TEAL } from '@/components/safety/EmergencySheet';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Row, SectionHeader } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { radius, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useMatchData } from '@/hooks/useMatchData';
import { useTheme } from '@/hooks/useTheme';
import { getSafety } from '@/services/api';
import { useApplicationsStore } from '@/store/useApplicationsStore';
import { useProfileStore } from '@/store/useProfileStore';
import { toast } from '@/store/useToastStore';
import type { CountryCode, EmergencyContact, HomeCountryCode } from '@/types/models';

const TEAL_SOFT = 'rgba(14, 116, 144, 0.12)';

/** Safety hub: emergency contact, local numbers and the embassy directory. */
export default function SafetyScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const profile = useProfileStore((s) => s.profile);
  const patchProfile = useProfileStore((s) => s.patchProfile);
  const applications = useApplicationsStore((s) => s.applications);
  const { matchData } = useMatchData();
  const safety = useAsync(() => getSafety(), []);

  const { control, handleSubmit } = useForm<EmergencyContact>({
    defaultValues: {
      name: profile?.emergencyContact?.name ?? '',
      relationship: profile?.emergencyContact?.relationship ?? '',
      phone: profile?.emergencyContact?.phone ?? '',
      email: profile?.emergencyContact?.email ?? '',
    },
  });

  const save = handleSubmit((values) => {
    patchProfile({ emergencyContact: values });
    toast(t('safety.contactSaved'));
  });

  // Destinations across the student's applications (deduped, in order).
  const nationality = (profile?.nationality ?? 'MY') as HomeCountryCode;
  const destinations: { country: CountryCode; city: string }[] = [];
  for (const a of applications) {
    const r = matchData?.resultByCourseId.get(a.courseId);
    if (r && !destinations.some((d) => d.country === r.course.country)) {
      destinations.push({ country: r.course.country as CountryCode, city: r.course.campusCity });
    }
  }

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <Row style={{ paddingVertical: spacing.md, gap: spacing.md }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="title">{t('safety.title')}</Text>
          <Text variant="caption" tone="secondary">{t('safety.subtitle')}</Text>
        </View>
        <View
          style={{
            width: 36, height: 36, borderRadius: radius.full, backgroundColor: TEAL_SOFT,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ionicons name="shield-checkmark" size={19} color={SAFETY_TEAL} />
        </View>
      </Row>

      <View style={{ gap: spacing.lg, paddingBottom: spacing.xxxl }}>
        <SectionHeader title={t('safety.contactTitle')} />
        <Card style={{ gap: spacing.md }}>
          <Text variant="caption" tone="secondary">{t('safety.contactWhy')}</Text>
          <Controller
            control={control}
            name="name"
            rules={{ required: t('onboarding.nameRequired') }}
            render={({ field, fieldState }) => (
              <TextField label={t('safety.contactName')} value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} autoCapitalize="words" />
            )}
          />
          <Controller
            control={control}
            name="relationship"
            render={({ field }) => (
              <TextField label={t('safety.contactRelationship')} placeholder={t('safety.relationshipPlaceholder')} value={field.value} onChangeText={field.onChange} />
            )}
          />
          <Controller
            control={control}
            name="phone"
            rules={{ required: t('safety.phoneRequired') }}
            render={({ field, fieldState }) => (
              <TextField label={t('safety.contactPhone')} value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} keyboardType="phone-pad" />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <TextField label={t('safety.contactEmail')} value={field.value} onChangeText={field.onChange} keyboardType="email-address" autoCapitalize="none" />
            )}
          />
          <Button label={t('safety.contactSave')} icon="save-outline" onPress={save} />
        </Card>

        {destinations.map((d) => {
          const lines = safety.data?.emergencyLines[d.country];
          const embassy = safety.data?.embassies[d.country]?.[nationality];
          return (
            <View key={d.country} style={{ gap: spacing.md }}>
              <SectionHeader title={t('safety.localNumbers', { country: t(`countries.${d.country}`) })} />
              {lines ? (
                <Row gap={spacing.sm}>
                  {([['police', 'shield-outline'], ['ambulance', 'medkit-outline'], ['fire', 'flame-outline']] as const).map(([k, icon]) => (
                    <Pressable
                      key={k}
                      accessibilityRole="button"
                      onPress={() => Linking.openURL(`tel:${lines[k]}`)}
                      style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: spacing.md, backgroundColor: TEAL_SOFT, borderRadius: radius.lg }}
                    >
                      <Ionicons name={icon} size={18} color={SAFETY_TEAL} />
                      <Text variant="heading" color={SAFETY_TEAL}>{lines[k]}</Text>
                      <Text variant="micro" tone="secondary">{t(`safety.${k}`).toUpperCase()}</Text>
                    </Pressable>
                  ))}
                </Row>
              ) : null}
              {embassy === null ? (
                <Card tone="alt">
                  <Text variant="caption" tone="secondary">{t('safety.embassyHome')}</Text>
                </Card>
              ) : embassy ? (
                <Card style={{ gap: 4 }}>
                  <Row gap={spacing.sm}>
                    <Ionicons name="business-outline" size={16} color={SAFETY_TEAL} />
                    <Text variant="label" style={{ flex: 1 }}>{embassy.name}</Text>
                  </Row>
                  <Text variant="caption" tone="secondary">{embassy.address}, {embassy.city}</Text>
                  <Row gap={spacing.md} style={{ marginTop: 2 }}>
                    <Pressable accessibilityRole="button" onPress={() => Linking.openURL(`tel:${embassy.phone.replace(/\s/g, '')}`)}>
                      <Text variant="caption" color={SAFETY_TEAL}>{embassy.phone}</Text>
                    </Pressable>
                    {embassy.afterHours ? (
                      <Text variant="caption" tone="faint">{t('safety.afterHours')}: {embassy.afterHours}</Text>
                    ) : null}
                  </Row>
                </Card>
              ) : null}
              <Card tone="alt" onPress={() => router.push('/arrival')} style={{ gap: 2 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row gap={spacing.sm}>
                    <Ionicons name="briefcase-outline" size={16} color={colors.accent} />
                    <Text variant="label">{t('safety.workRightsLink', { country: t(`countries.${d.country}`) })}</Text>
                  </Row>
                  <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
                </Row>
              </Card>
            </View>
          );
        })}

        {destinations.length === 0 ? (
          <Card tone="alt">
            <Text variant="caption" tone="secondary">{t('safety.noDestination')}</Text>
          </Card>
        ) : null}

        <Text variant="caption" tone="faint" center>{t('safety.verifyNote')}</Text>
      </View>
    </Screen>
  );
}

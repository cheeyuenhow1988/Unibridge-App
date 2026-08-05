import { router } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { PickerField } from '@/components/ui/PickerField';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { FLAGS, HOME_COUNTRIES, INTERNATIONAL_QUALS, RECOMMENDED_QUALS } from '@/constants/countries';
import { spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { getQualificationSystems } from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';
import type { HomeCountryCode, QualificationId } from '@/types/models';

interface FormValues {
  name: string;
  homeCountry: HomeCountryCode;
  nationality: HomeCountryCode;
  qualification: QualificationId;
  intakeYear: number;
  ecName: string;
  ecRelationship: string;
  ecPhone: string;
  ecEmail: string;
}

export default function ProfileSetup() {
  const { t } = useTranslation();
  const existing = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);
  const account = useAuthStore((s) => s.account);
  const systems = useAsync(getQualificationSystems);

  const { control, handleSubmit, getValues, setValue } = useForm<FormValues>({
    defaultValues: {
      // Carry the sign-up name over — nobody should type it twice.
      name: existing?.name ?? account?.name ?? '',
      homeCountry: existing?.homeCountry ?? 'MY',
      nationality: existing?.nationality ?? 'MY',
      qualification: existing?.qualification ?? 'spm',
      intakeYear: existing?.intakeYear ?? 2027,
      ecName: existing?.emergencyContact?.name ?? '',
      ecRelationship: existing?.emergencyContact?.relationship ?? '',
      ecPhone: existing?.emergencyContact?.phone ?? '',
      ecEmail: existing?.emergencyContact?.email ?? '',
    },
  });

  const countryOptions = HOME_COUNTRIES.map((c) => ({
    value: c,
    label: t(`countries.${c}`),
    emoji: FLAGS[c],
  }));

  // The picker recommends the system used in the student's home country, but
  // every other system stays selectable (IB, A-Levels, another country's exams).
  const homeCountry = useWatch({ control, name: 'homeCountry' });
  const recommended = RECOMMENDED_QUALS[homeCountry] ?? [];
  const allSystems = systems.data ?? [];
  const qualOptions = [
    ...recommended
      .map((id) => allSystems.find((s) => s.id === id))
      .filter((s) => s !== undefined)
      .map((s) => ({ value: s.id, label: s.name, sublabel: s.region, tag: t('onboarding.recommended') })),
    ...allSystems
      .filter((s) => !recommended.includes(s.id))
      .map((s) => ({ value: s.id, label: s.name, sublabel: s.region })),
  ];

  const onHomeCountryChange = (c: HomeCountryCode) => {
    const rec = RECOMMENDED_QUALS[c] ?? [];
    const current = getValues('qualification');
    // Follow the new country's national system — unless the student deliberately
    // chose an international qualification (IB, A-Levels, generic GPA).
    if (rec.length > 0 && !rec.includes(current) && !INTERNATIONAL_QUALS.includes(current)) {
      setValue('qualification', rec[0]);
    }
  };

  const onNext = handleSubmit(({ ecName, ecRelationship, ecPhone, ecEmail, ...values }) => {
    setProfile({
      ...values,
      grades: existing?.qualification === values.qualification ? existing?.grades ?? {} : {},
      english: existing?.english ?? { test: 'none' },
      // Optional here — but required before the first application submits.
      emergencyContact:
        ecName.trim() && ecPhone.trim()
          ? { name: ecName.trim(), relationship: ecRelationship.trim(), phone: ecPhone.trim(), email: ecEmail.trim() }
          : existing?.emergencyContact,
    });
    router.push('/onboarding/grades');
  });

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={{ gap: spacing.xl, paddingTop: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text variant="title">{t('onboarding.profileTitle')}</Text>
          <Text variant="body" tone="secondary">{t('onboarding.profileSubtitle')}</Text>
        </View>

        <Controller
          control={control}
          name="name"
          rules={{ required: t('onboarding.nameRequired') }}
          render={({ field, fieldState }) => (
            <TextField
              label={t('onboarding.nameLabel')}
              placeholder={t('onboarding.namePlaceholder')}
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
              autoCapitalize="words"
            />
          )}
        />

        <Controller
          control={control}
          name="homeCountry"
          render={({ field }) => (
            <PickerField
              label={t('onboarding.homeCountryLabel')}
              hint={t('onboarding.homeCountryHint')}
              value={field.value}
              options={countryOptions}
              onChange={(c) => {
                field.onChange(c);
                onHomeCountryChange(c);
              }}
            />
          )}
        />

        <Controller
          control={control}
          name="nationality"
          render={({ field }) => (
            <PickerField
              label={t('onboarding.nationalityLabel')}
              hint={t('onboarding.nationalityHint')}
              value={field.value}
              options={countryOptions}
              onChange={field.onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="qualification"
          render={({ field }) => (
            <PickerField
              label={t('onboarding.qualificationLabel')}
              hint={t('onboarding.qualHint')}
              value={field.value}
              options={qualOptions}
              onChange={field.onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="intakeYear"
          render={({ field }) => (
            <PickerField
              label={t('onboarding.intakeYearLabel')}
              value={field.value}
              options={[2026, 2027, 2028].map((y) => ({ value: y, label: String(y) }))}
              onChange={field.onChange}
            />
          )}
        />

        <View style={{ gap: spacing.xs }}>
          <Text variant="label">{t('safety.contactTitle')}</Text>
          <Text variant="caption" tone="secondary">{t('onboarding.emergencySub')}</Text>
        </View>
        <Controller
          control={control}
          name="ecName"
          render={({ field }) => (
            <TextField label={t('safety.contactName')} value={field.value} onChangeText={field.onChange} autoCapitalize="words" />
          )}
        />
        <Controller
          control={control}
          name="ecRelationship"
          render={({ field }) => (
            <TextField label={t('safety.contactRelationship')} placeholder={t('safety.relationshipPlaceholder')} value={field.value} onChangeText={field.onChange} />
          )}
        />
        <Controller
          control={control}
          name="ecPhone"
          render={({ field }) => (
            <TextField label={t('safety.contactPhone')} value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" />
          )}
        />
        <Controller
          control={control}
          name="ecEmail"
          render={({ field }) => (
            <TextField label={t('safety.contactEmail')} value={field.value} onChangeText={field.onChange} keyboardType="email-address" autoCapitalize="none" />
          )}
        />

        <Button label={t('common.continue')} size="lg" onPress={onNext} />
      </View>
    </Screen>
  );
}

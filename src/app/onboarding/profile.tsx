import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { PickerField } from '@/components/ui/PickerField';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { FLAGS, HOME_COUNTRIES } from '@/constants/countries';
import { spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { getQualificationSystems } from '@/services/api';
import { useProfileStore } from '@/store/useProfileStore';
import type { HomeCountryCode, QualificationId } from '@/types/models';

interface FormValues {
  name: string;
  homeCountry: HomeCountryCode;
  nationality: HomeCountryCode;
  qualification: QualificationId;
  intakeYear: number;
}

export default function ProfileSetup() {
  const { t } = useTranslation();
  const existing = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);
  const systems = useAsync(getQualificationSystems);

  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      name: existing?.name ?? '',
      homeCountry: existing?.homeCountry ?? 'MY',
      nationality: existing?.nationality ?? 'MY',
      qualification: existing?.qualification ?? 'spm',
      intakeYear: existing?.intakeYear ?? 2027,
    },
  });

  const countryOptions = HOME_COUNTRIES.map((c) => ({
    value: c,
    label: t(`countries.${c}`),
    emoji: FLAGS[c],
  }));

  const onNext = handleSubmit((values) => {
    setProfile({
      ...values,
      grades: existing?.qualification === values.qualification ? existing?.grades ?? {} : {},
      english: existing?.english ?? { test: 'none' },
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
              onChange={field.onChange}
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
              value={field.value}
              options={(systems.data ?? []).map((s) => ({ value: s.id, label: s.name, sublabel: s.region }))}
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

        <Button label={t('common.continue')} size="lg" onPress={onNext} />
      </View>
    </Screen>
  );
}

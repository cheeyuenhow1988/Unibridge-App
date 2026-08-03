import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, Switch, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Row, SectionHeader } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { FLAGS } from '@/constants/countries';
import { radius, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useMatchData } from '@/hooks/useMatchData';
import { useTheme } from '@/hooks/useTheme';
import { getPredepartureChecklist, getWorkRights } from '@/services/api';
import { useApplicationsStore } from '@/store/useApplicationsStore';

interface PickupForm {
  name: string;
  phone: string;
  flight: string;
}

export default function Predeparture() {
  const { appId } = useLocalSearchParams<{ appId: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { matchData, loading, error, retry } = useMatchData();
  const application = useApplicationsStore((s) => s.applications.find((a) => a.id === appId));
  const setPickup = useApplicationsStore((s) => s.setPickup);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [reminders, setReminders] = useState<Record<string, boolean>>({ r7: true, r30: false });
  const [pickupSaved, setPickupSaved] = useState(false);

  const result = application ? matchData?.resultByCourseId.get(application.courseId) : undefined;
  const country = result?.course.country;

  const checklist = useAsync(
    () => (country ? getPredepartureChecklist(country) : Promise.resolve([])),
    [country],
  );
  const workRights = useAsync(
    () => (country ? getWorkRights(country) : Promise.resolve(undefined)),
    [country],
  );

  const { control, handleSubmit } = useForm<PickupForm>({
    defaultValues: {
      name: application?.pickup?.name ?? '',
      phone: application?.pickup?.phone ?? '',
      flight: application?.pickup?.flight ?? '',
    },
  });

  const [nowTs] = useState(() => Date.now());
  const nextIntake = useMemo(() => {
    if (!result) return null;
    return result.course.intakes.find((i) => new Date(`${i}-01`).getTime() > nowTs) ?? result.course.intakes.at(-1) ?? null;
  }, [result, nowTs]);

  const daysToGo = useMemo(() => {
    if (!nextIntake) return null;
    const diff = new Date(`${nextIntake}-01`).getTime() - nowTs;
    return Math.max(0, Math.ceil(diff / 86400000));
  }, [nextIntake, nowTs]);

  if (loading) {
    return (
      <Screen edges={['top', 'bottom']}>
        <SkeletonCards count={4} height={110} />
      </Screen>
    );
  }
  if (error || !application || !result || !country) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ErrorState onRetry={retry} />
      </Screen>
    );
  }

  const savePickup = handleSubmit((values) => {
    setPickup(application.id, values);
    setPickupSaved(true);
  });

  const doneCount = Object.values(checked).filter(Boolean).length;

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <Row style={{ justifyContent: 'space-between', paddingVertical: spacing.md }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text variant="heading">{t('predeparture.title')}</Text>
        <View style={{ width: 24 }} />
      </Row>

      <View style={{ gap: spacing.lg }}>
        <Text variant="body" tone="secondary">
          {t('predeparture.subtitle', { city: result.course.campusCity })}
        </Text>

        <LinearGradient
          colors={[colors.gradientFrom, colors.gradientTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', gap: 4 }}
        >
          <Text variant="micro" color={colors.pop} style={{ letterSpacing: 2 }}>
            {t('predeparture.countdown').toUpperCase()}
          </Text>
          <Text variant="hero" color={colors.onGradient}>
            {daysToGo !== null ? t('predeparture.days', { count: daysToGo }) : '—'}
          </Text>
          <Text variant="caption" color={colors.onGradientSoft}>{t('predeparture.toGo', { intake: nextIntake ?? '' })}</Text>
          <Row style={{ marginTop: spacing.md, justifyContent: 'space-between', width: '100%' }}>
            {(['r7', 'r30'] as const).map((key) => (
              <Row key={key} gap={spacing.sm}>
                <Switch
                  value={reminders[key]}
                  onValueChange={(v) => setReminders((r) => ({ ...r, [key]: v }))}
                  trackColor={{ true: colors.pop, false: colors.gradientTrack }}
                  thumbColor={colors.surface}
                />
                <Text variant="caption" color={colors.onGradientSoft}>
                  {key === 'r7' ? t('predeparture.reminder7') : t('predeparture.reminder30')}
                </Text>
              </Row>
            ))}
          </Row>
        </LinearGradient>

        <SectionHeader
          title={t('predeparture.checklist', { country: t(`countries.${country}`) })}
          right={<Text variant="caption" tone="faint">{doneCount}/{checklist.data?.length ?? 0}</Text>}
        />
        <Card padded={false}>
          {(checklist.data ?? []).map((item, i) => {
            const done = !!checked[item.id];
            return (
              <Pressable
                key={item.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: done }}
                onPress={() => setChecked((c) => ({ ...c, [item.id]: !c[item.id] }))}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.lg,
                  borderTopWidth: i > 0 ? 1 : 0,
                  borderTopColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Ionicons
                  name={done ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={done ? colors.accent : colors.inkFaint}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    variant="bodyMedium"
                    tone={done ? 'faint' : 'primary'}
                    style={done ? { textDecorationLine: 'line-through' } : undefined}
                  >
                    {item.label}
                  </Text>
                  <Text variant="micro" tone="faint">
                    {t(`predeparture.categories.${item.category}`).toUpperCase()}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </Card>

        <SectionHeader title={t('predeparture.pickupTitle')} />
        <Card style={{ gap: spacing.md }}>
          <Row gap={spacing.md}>
            <View
              style={{
                width: 52, height: 52, borderRadius: radius.full, backgroundColor: colors.surfaceAlt,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="person-outline" size={24} color={colors.inkFaint} />
            </View>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <TextField placeholder={t('predeparture.pickupName')} value={field.value} onChangeText={field.onChange} />
                )}
              />
            </View>
          </Row>
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <TextField placeholder={t('predeparture.pickupPhone')} value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" />
            )}
          />
          <Controller
            control={control}
            name="flight"
            render={({ field }) => (
              <TextField
                placeholder={t('predeparture.pickupFlightPlaceholder')}
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />
          <Button
            label={pickupSaved ? t('predeparture.pickupSaved') : t('predeparture.pickupSave')}
            icon={pickupSaved ? 'checkmark' : 'save-outline'}
            variant={pickupSaved ? 'secondary' : 'primary'}
            onPress={savePickup}
          />
        </Card>

        <SectionHeader title={t('predeparture.workRights')} />
        {workRights.data ? (
          <Card style={{ gap: spacing.sm }}>
            <Row gap={spacing.sm}>
              <Badge
                tone="accent"
                icon="briefcase-outline"
                label={t('predeparture.workHours', { hours: workRights.data.hoursPerWeekTerm })}
              />
              <Text variant="caption" tone="faint">{FLAGS[country]} {t(`countries.${country}`)}</Text>
            </Row>
            <Text variant="caption" tone="secondary">
              {t('predeparture.workBreaks', { rule: workRights.data.breakRule })}
            </Text>
            <Text variant="caption" tone="faint">{workRights.data.note}</Text>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

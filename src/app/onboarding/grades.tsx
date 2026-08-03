import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { PickerField } from '@/components/ui/PickerField';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useTheme } from '@/hooks/useTheme';
import { getQualificationSystems } from '@/services/api';
import { useProfileStore } from '@/store/useProfileStore';
import type { EnglishTest, SubjectGrade } from '@/types/models';

export default function GradeEntry() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const profile = useProfileStore((s) => s.profile);
  const patchProfile = useProfileStore((s) => s.patchProfile);
  const completeOnboarding = useProfileStore((s) => s.completeOnboarding);
  const systems = useAsync(getQualificationSystems);
  const system = useMemo(
    () => systems.data?.find((s) => s.id === profile?.qualification),
    [systems.data, profile?.qualification],
  );

  const [rows, setRows] = useState<SubjectGrade[]>([]);
  const [total, setTotal] = useState('');
  const [test, setTest] = useState<EnglishTest>(profile?.english.test ?? 'none');
  const [score, setScore] = useState(profile?.english.score ? String(profile.english.score) : '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!system) return;
    if (system.mode === 'subjects') {
      const existing = profile?.grades.subjects;
      if (existing?.length) setRows(existing);
      else {
        const opts = system.subjectOptions ?? [];
        setRows(Array.from({ length: system.subjectCount ?? 3 }, (_, i) => ({ subject: opts[i] ?? '', grade: '' })));
      }
    } else if (typeof profile?.grades.total === 'number') {
      setTotal(String(profile.grades.total));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system?.id]);

  if (!profile || !system) return <Screen edges={['top', 'bottom']} />;

  const gradeOptions = (system.grades ?? []).map((g) => ({ value: g.label, label: g.label }));
  const subjectOptions = (system.subjectOptions ?? []).map((s) => ({ value: s, label: s }));
  const minRows = system.subjectCount ?? 3;
  const maxRows = system.maxSubjects ?? minRows;

  const ieltsOptions = Array.from({ length: 11 }, (_, i) => 4 + i * 0.5).map((v) => ({
    value: String(v),
    label: v.toFixed(1),
  }));

  const onSave = () => {
    if (system.mode === 'subjects') {
      const filled = rows.filter((r) => r.subject && r.grade);
      if (filled.length < minRows) {
        setError(t('onboarding.subjectsRequired', { count: minRows }));
        return;
      }
      patchProfile({ grades: { subjects: filled } });
    } else {
      const value = Number(total);
      const min = system.min ?? 0;
      const max = system.max ?? 100;
      if (!Number.isFinite(value) || total === '' || value < min || value > max) {
        setError(t('onboarding.totalRequired', { min, max }));
        return;
      }
      patchProfile({ grades: { total: value } });
    }
    patchProfile({
      english: test === 'none' ? { test: 'none' } : { test, score: Number(score) || 0 },
    });
    completeOnboarding();
    router.dismissAll();
    router.replace('/(tabs)/match');
  };

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={{ gap: spacing.xl, paddingTop: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text variant="title">{t('onboarding.gradesTitle')}</Text>
          <Text variant="body" tone="secondary">
            {system.mode === 'subjects'
              ? t('onboarding.gradesSubtitleSubjects', { system: system.name })
              : t('onboarding.gradesSubtitleTotal', { system: system.name })}
          </Text>
        </View>

        {system.mode === 'subjects' ? (
          <View style={{ gap: spacing.md }}>
            {rows.map((row, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
                <View style={{ flex: 3 }}>
                  <PickerField
                    label={i === 0 ? t('onboarding.subjectLabel') : undefined}
                    value={row.subject || undefined}
                    placeholder={t('onboarding.subjectLabel')}
                    options={subjectOptions}
                    onChange={(v) => setRows((r) => r.map((x, j) => (j === i ? { ...x, subject: v } : x)))}
                  />
                </View>
                <View style={{ flex: 2 }}>
                  <PickerField
                    label={i === 0 ? t('onboarding.gradeLabel') : undefined}
                    value={row.grade || undefined}
                    placeholder={t('onboarding.gradeLabel')}
                    options={gradeOptions}
                    onChange={(v) => setRows((r) => r.map((x, j) => (j === i ? { ...x, grade: v } : x)))}
                  />
                </View>
                {rows.length > minRows ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('common.remove')}
                    onPress={() => setRows((r) => r.filter((_, j) => j !== i))}
                    style={{ height: 50, width: 44, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="close-circle-outline" size={22} color={colors.inkFaint} />
                  </Pressable>
                ) : null}
              </View>
            ))}
            {rows.length < maxRows ? (
              <Button
                label={t('onboarding.addSubject')}
                variant="ghost"
                size="sm"
                icon="add-circle-outline"
                onPress={() => setRows((r) => [...r, { subject: '', grade: '' }])}
                style={{ alignSelf: 'flex-start' }}
              />
            ) : null}
          </View>
        ) : (
          <TextField
            label={t('onboarding.totalScoreLabel', { unit: system.unit })}
            hint={t('onboarding.totalScoreRange', { min: system.min, max: system.max })}
            value={total}
            onChangeText={setTotal}
            keyboardType="decimal-pad"
          />
        )}

        <View style={{ gap: spacing.md }}>
          <Text variant="heading">{t('onboarding.englishTitle')}</Text>
          <Text variant="body" tone="secondary">{t('onboarding.englishSubtitle')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {(['ielts', 'toefl', 'none'] as const).map((opt) => (
              <Chip
                key={opt}
                label={opt === 'ielts' ? t('onboarding.ielts') : opt === 'toefl' ? t('onboarding.toefl') : t('onboarding.noTest')}
                selected={test === opt}
                onPress={() => setTest(opt)}
              />
            ))}
          </View>
          {test === 'ielts' ? (
            <PickerField
              label={t('onboarding.scoreLabel')}
              value={score || undefined}
              placeholder={t('onboarding.scoreLabel')}
              options={ieltsOptions}
              onChange={setScore}
            />
          ) : null}
          {test === 'toefl' ? (
            <TextField
              label={t('onboarding.scoreLabel')}
              value={score}
              onChangeText={setScore}
              keyboardType="number-pad"
              placeholder="0–120"
            />
          ) : null}
        </View>

        {error ? <Text variant="caption" tone="danger">{error}</Text> : null}
        <Button label={t('onboarding.seeMatches')} size="lg" onPress={onSave} />
      </View>
    </Screen>
  );
}

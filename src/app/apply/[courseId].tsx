import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PickerField } from '@/components/ui/PickerField';
import { Divider, Row } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useTheme } from '@/hooks/useTheme';
import { getCourse, getInstitution, listScholarships } from '@/services/api';
import { hapticSuccess } from '@/services/haptics';
import { formatMoney } from '@/services/currency';
import { LockChip, UpgradeSheet } from '@/components/plan/UpgradeSheet';
import { useApplicationsStore } from '@/store/useApplicationsStore';
import { FREE_ACTIVE_APPLICATIONS, usePlan } from '@/store/usePlanStore';
import { useSavedStore } from '@/store/useSavedStore';
import { useVaultStore } from '@/store/useVaultStore';
import { toast } from '@/store/useToastStore';

type Step = 'checklist' | 'review' | 'done';

export default function ApplyFlow() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const documents = useVaultStore((s) => s.documents);
  const savedScholarshipIds = useSavedStore((s) => s.savedScholarshipIds);
  const startApplication = useApplicationsStore((s) => s.startApplication);

  const [step, setStep] = useState<Step>('checklist');
  const [intake, setIntake] = useState<string | undefined>();
  const [scholarshipId, setScholarshipId] = useState<string>('none');
  const [appId, setAppId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const plan = usePlan();
  const activeApplications = useApplicationsStore((s) => s.applications.length);

  const state = useAsync(async () => {
    const course = await getCourse(courseId);
    if (!course) throw new Error('not found');
    const [institution, scholarships] = await Promise.all([
      getInstitution(course.institutionId),
      listScholarships(),
    ]);
    return { course, institution: institution!, scholarships };
  }, [courseId]);

  const checklist = useMemo(() => {
    const course = state.data?.course;
    if (!course) return [];
    return course.requiredDocuments.map((doc) => ({
      doc,
      done: documents.some((d) => d.type === doc),
    }));
  }, [state.data, documents]);

  if (state.loading) {
    return (
      <Screen edges={['top', 'bottom']}>
        <SkeletonCards count={4} height={90} />
      </Screen>
    );
  }
  if (state.error || !state.data) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ErrorState onRetry={state.retry} />
      </Screen>
    );
  }

  const { course, institution, scholarships } = state.data;
  // Fee waivers at Verified Partners are a Season Pass perk.
  const feeWaived = institution.verifiedPartner && plan !== 'free';
  const doneCount = checklist.filter((c) => c.done).length;
  const shortlisted = scholarships.filter((s) => savedScholarshipIds.includes(s.id));

  const submit = () => {
    // Free tier runs one active application at a time — sheet, not a hard block.
    if (plan === 'free' && activeApplications >= FREE_ACTIVE_APPLICATIONS) {
      setUpgradeOpen(true);
      return;
    }
    const app = startApplication(
      course.id,
      feeWaived,
      intake ?? course.intakes[0],
      scholarshipId === 'none' ? undefined : scholarshipId,
    );
    hapticSuccess();
    setAppId(app.id);
    setStep('done');
  };

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <Row style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, justifyContent: 'space-between' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => (step === 'review' ? setStep('checklist') : router.back())}
          hitSlop={10}
        >
          <Ionicons name={step === 'review' ? 'chevron-back' : 'chevron-down'} size={24} color={colors.ink} />
        </Pressable>
        <Text variant="heading">{t('apply.title')}</Text>
        <View style={{ width: 24 }} />
      </Row>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl }}>
        {step === 'done' ? (
          <View style={{ alignItems: 'center', gap: spacing.lg, paddingTop: spacing.xxxl }}>
            <View
              style={{
                width: 96, height: 96, borderRadius: radius.full, backgroundColor: colors.eligibleSoft,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="checkmark" size={44} color={colors.eligible} />
            </View>
            <Text variant="title" center>{t('apply.submittedTitle')}</Text>
            <Text variant="body" tone="secondary" center>{t('apply.submittedBody')}</Text>
            <Button
              label={t('apply.viewApplication')}
              size="lg"
              onPress={() => {
                router.back();
                if (appId) router.push(`/application/${appId}`);
              }}
            />
          </View>
        ) : (
          <>
            <Card style={{ gap: 4 }}>
              <Text variant="caption" tone="secondary">{institution.name}</Text>
              <Text variant="sub">{course.name}</Text>
              {feeWaived ? <Badge tone="verified" icon="pricetag" label={t('apply.feeWaivedBadge')} /> : null}
            </Card>

            {step === 'checklist' ? (
              <>
                <View style={{ gap: 4 }}>
                  <Text variant="heading">{t('apply.checklistTitle')}</Text>
                  <Text variant="caption" tone="secondary">{t('apply.checklistSubtitle')}</Text>
                </View>
                <Card padded={false}>
                  {checklist.map(({ doc, done }, i) => (
                    <View key={doc}>
                      {i > 0 ? <Divider /> : null}
                      <Row style={{ padding: spacing.lg, justifyContent: 'space-between' }}>
                        <Row gap={spacing.md} style={{ flex: 1 }}>
                          <Ionicons
                            name={done ? 'checkmark-circle' : 'alert-circle'}
                            size={22}
                            color={done ? colors.eligible : colors.danger}
                          />
                          <Text variant="bodyMedium" style={{ flex: 1 }}>{t(`docs.${doc}`)}</Text>
                        </Row>
                        <Text variant="caption" tone={done ? 'secondary' : 'danger'}>
                          {done ? t('apply.inVault') : t('apply.notInVault')}
                        </Text>
                      </Row>
                    </View>
                  ))}
                  <View style={{ paddingVertical: spacing.sm, gap: 4 }}>
                    <Row gap={spacing.sm}>
                      <Ionicons
                        name={plan !== 'free' ? 'shield-checkmark' : 'lock-closed'}
                        size={18}
                        color={plan !== 'free' ? colors.eligible : colors.inkFaint}
                      />
                      <Text variant="body" tone={plan !== 'free' ? 'primary' : 'faint'} style={{ flex: 1 }}>
                        {t('apply.reviewedStep')}
                      </Text>
                      {plan !== 'free' ? (
                        <Badge tone="eligible" icon="checkmark" label={t('pass.colPass')} />
                      ) : (
                        <LockChip onPress={() => setUpgradeOpen(true)} />
                      )}
                    </Row>
                    <Row gap={spacing.sm}>
                      <Ionicons
                        name={plan !== 'free' ? 'chatbox-ellipses-outline' : 'lock-closed'}
                        size={18}
                        color={plan !== 'free' ? colors.accent : colors.inkFaint}
                      />
                      {plan !== 'free' ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => toast(t('apply.sopSent'))}
                          style={{ flex: 1 }}
                        >
                          <Text variant="body" tone="accent">{t('apply.sopRequest')}</Text>
                        </Pressable>
                      ) : (
                        <>
                          <Text variant="body" tone="faint" style={{ flex: 1 }}>{t('apply.sopRequest')}</Text>
                          <LockChip onPress={() => setUpgradeOpen(true)} />
                        </>
                      )}
                    </Row>
                  </View>
                </Card>
                <Button
                  label={t('apply.openVault')}
                  variant="secondary"
                  icon="folder-open-outline"
                  onPress={() => router.push('/vault')}
                />
                {doneCount < checklist.length ? (
                  <Text variant="caption" tone="faint" center>{t('apply.missingWarning')}</Text>
                ) : null}
                <Button label={t('common.continue')} size="lg" onPress={() => setStep('review')} />
              </>
            ) : (
              <>
                <Text variant="heading">{t('apply.reviewTitle')}</Text>
                <Card style={{ gap: spacing.sm }}>
                  {[
                    [t('apply.reviewCourse'), course.name],
                    [t('apply.reviewInstitution'), institution.name],
                    [t('apply.reviewDocuments'), t('apply.reviewDocumentsCount', { done: doneCount, total: checklist.length })],
                  ].map(([label, value]) => (
                    <Row key={label} style={{ justifyContent: 'space-between' }}>
                      <Text variant="caption" tone="secondary">{label}</Text>
                      <Text variant="label" style={{ flex: 1, textAlign: 'right' }} numberOfLines={2}>{value}</Text>
                    </Row>
                  ))}
                </Card>

                <PickerField
                  label={t('apply.reviewIntake')}
                  value={intake ?? course.intakes[0]}
                  options={course.intakes.map((i) => ({ value: i, label: i }))}
                  onChange={setIntake}
                />

                {shortlisted.length > 0 ? (
                  <PickerField
                    label={t('apply.scholarshipAttach')}
                    value={scholarshipId}
                    options={[
                      { value: 'none', label: t('apply.noScholarship') },
                      ...shortlisted.map((s) => ({ value: s.id, label: s.name, sublabel: s.provider })),
                    ]}
                    onChange={setScholarshipId}
                  />
                ) : null}

                <Card style={{ gap: spacing.xs }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text variant="caption" tone="secondary">{t('apply.applicationFee')}</Text>
                    <Text
                      variant="label"
                      style={feeWaived ? { textDecorationLine: 'line-through' } : undefined}
                      tone={feeWaived ? 'faint' : 'primary'}
                    >
                      {formatMoney(course.applicationFee, course.currency)}
                    </Text>
                  </Row>
                  {feeWaived ? <Badge tone="verified" icon="pricetag" label={t('apply.feeWaivedBadge')} /> : null}
                </Card>

                <Text variant="caption" tone="faint" center>{t('apply.submitMock')}</Text>
                <Button label={t('apply.submit')} size="lg" onPress={submit} />
              </>
            )}
          </>
        )}
      </ScrollView>
      <UpgradeSheet visible={upgradeOpen} context="apply" onClose={() => setUpgradeOpen(false)} />
    </Screen>
  );
}

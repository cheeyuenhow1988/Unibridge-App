import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, View } from 'react-native';
import { DepositModal } from '@/components/applications/DepositModal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { FLAGS } from '@/constants/countries';
import { radius, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useMatchData } from '@/hooks/useMatchData';
import { useTheme } from '@/hooks/useTheme';
import { getSupportBundle } from '@/services/api';
import { hapticSuccess } from '@/services/haptics';
import { LockChip, UpgradeSheet, type UpgradeContext } from '@/components/plan/UpgradeSheet';
import { useApplicationsStore } from '@/store/useApplicationsStore';
import { usePlan } from '@/store/usePlanStore';
import { APPLICATION_TIMELINE, type ApplicationStatus } from '@/types/models';

// Free tier tracks the three big moments; the pass unlocks every sub-status.
const BASIC_TIMELINE: ApplicationStatus[] = ['submitted', 'offer', 'accepted'];
const BASIC_MAP: Record<ApplicationStatus, ApplicationStatus> = {
  submitted: 'submitted', under_review: 'submitted', conditional_offer: 'offer',
  offer: 'offer', accepted: 'accepted', coe_issued: 'accepted',
};

export default function ApplicationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { matchData, loading, error, retry } = useMatchData();
  const application = useApplicationsStore((s) => s.applications.find((a) => a.id === id));
  const advanceStatus = useApplicationsStore((s) => s.advanceStatus);
  const acceptOffer = useApplicationsStore((s) => s.acceptOffer);
  const [depositOpen, setDepositOpen] = useState(false);
  const [fullTeam, setFullTeam] = useState(false);
  const [upgrade, setUpgrade] = useState<UpgradeContext | null>(null);
  const plan = usePlan();
  const support = useAsync(() => getSupportBundle(), []);

  if (loading) {
    return (
      <Screen edges={['top', 'bottom']}>
        <SkeletonCards count={4} height={100} />
      </Screen>
    );
  }
  const result = application ? matchData?.resultByCourseId.get(application.courseId) : undefined;
  if (error || !application || !result) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ErrorState onRetry={retry} />
      </Screen>
    );
  }

  const { course, institution } = result;
  const currentIdx = APPLICATION_TIMELINE.indexOf(application.status);
  const canAdvance = currentIdx < APPLICATION_TIMELINE.length - 1 && application.status !== 'offer' && application.status !== 'conditional_offer';
  const hasOffer = application.status === 'offer' || application.status === 'conditional_offer';
  const acceptedOrLater = currentIdx >= APPLICATION_TIMELINE.indexOf('accepted');

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <Row style={{ justifyContent: 'space-between', paddingVertical: spacing.md }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Badge tone={application.status === 'accepted' || application.status === 'coe_issued' ? 'eligible' : 'accent'} label={t(`status.${application.status}`)} />
      </Row>

      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: 4 }}>
          <Pressable accessibilityRole="button" onPress={() => router.push(`/institution/${institution.id}`)}>
            <Text variant="caption" tone="accent">
              {FLAGS[course.country]} {institution.name}
            </Text>
          </Pressable>
          <Text variant="title">{course.name}</Text>
          <Text variant="caption" tone="faint">
            {application.intake ? `${t('applications.intakeLabel', { intake: application.intake })} · ` : ''}
            {t('applications.appliedOn', { date: application.createdAt })} · {t('applications.updated', { date: application.updatedAt })}
          </Text>
        </View>

        <Card style={{ gap: 0 }}>
          <Row style={{ justifyContent: 'space-between', marginBottom: spacing.md }}>
            <Text variant="label">{t('applications.timeline')}</Text>
            {plan !== 'free' ? (
              <Badge tone="accent" icon="flash" label={t('pass.priority')} />
            ) : (
              <LockChip onPress={() => setUpgrade('timeline')} />
            )}
          </Row>
          {(plan !== 'free' ? APPLICATION_TIMELINE : BASIC_TIMELINE).map((status, i, timeline) => {
            const shownIdx = timeline.indexOf(plan !== 'free' ? application.status : BASIC_MAP[application.status]);
            const entry = application.history.find((h) => h.status === status);
            const done = i < shownIdx || (plan !== 'free' ? !!entry : i < shownIdx);
            const current = i === shownIdx;
            const last = i === timeline.length - 1;
            return (
              <Row key={status} gap={spacing.md} style={{ alignItems: 'stretch' }}>
                <View style={{ alignItems: 'center', width: 24 }}>
                  <View
                    style={{
                      width: 22, height: 22, borderRadius: radius.full,
                      backgroundColor: done ? colors.accent : colors.surfaceAlt,
                      borderWidth: current ? 3 : 0,
                      borderColor: colors.accentSoft,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {done ? <Ionicons name="checkmark" size={12} color={colors.onAccent} /> : null}
                  </View>
                  {!last ? (
                    <View style={{ width: 2, flex: 1, minHeight: 22, backgroundColor: done ? colors.accent : colors.surfaceAlt }} />
                  ) : null}
                </View>
                <View style={{ paddingBottom: last ? 0 : spacing.lg, flex: 1 }}>
                  <Text variant={current ? 'label' : 'body'} tone={done || current ? 'primary' : 'faint'}>
                    {t(`status.${status}`)}
                  </Text>
                  {entry ? <Text variant="caption" tone="faint">{entry.date}</Text> : null}
                </View>
              </Row>
            );
          })}
        </Card>

        {hasOffer ? (
          <Button label={t('applications.acceptOffer')} size="lg" icon="checkmark-circle-outline" onPress={() => setDepositOpen(true)} />
        ) : null}

        {application.depositPaid ? (
          <Card tone="accent">
            <Text variant="label" tone="accent">{t('applications.depositPaid')}</Text>
          </Card>
        ) : null}

        {acceptedOrLater ? (
          <Button
            label={t('applications.predeparture')}
            icon="airplane-outline"
            variant="secondary"
            onPress={() => router.push(`/predeparture/${application.id}`)}
          />
        ) : null}

        {support.data && plan === 'free' ? (
          <Card style={{ gap: spacing.sm }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={spacing.sm}>
                <Ionicons name="people-circle-outline" size={20} color={colors.accent} />
                <Text variant="label">{t('team.title')}</Text>
              </Row>
              <LockChip onPress={() => setUpgrade('team')} />
            </Row>
            <Pressable accessibilityRole="button" onPress={() => setUpgrade('team')}>
              <View style={{ opacity: 0.35, gap: spacing.md }} pointerEvents="none">
                {support.data.team.slice(0, 2).map((s) => (
                  <Row key={s.id} gap={spacing.md}>
                    <Image source={{ uri: s.avatar }} style={{ width: 40, height: 40, borderRadius: radius.full }} blurRadius={8} />
                    <View style={{ flex: 1 }}>
                      <Text variant="sub">██████ ████</Text>
                      <Text variant="caption" tone="faint">{t(`team.role_${s.role}`)}</Text>
                    </View>
                    <Ionicons name="call-outline" size={18} color={colors.inkFaint} />
                    <Ionicons name="mail-outline" size={18} color={colors.inkFaint} />
                  </Row>
                ))}
              </View>
            </Pressable>
            <Text variant="caption" tone="accent">{t('pass.lockedTeam')}</Text>
          </Card>
        ) : null}

        {support.data && plan !== 'free' ? (
          <Card style={{ gap: spacing.md }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={spacing.sm}>
                <Ionicons name="people-circle-outline" size={20} color={colors.accent} />
                <Text variant="label">{t('team.title')}</Text>
              </Row>
              <Pressable accessibilityRole="button" onPress={() => setFullTeam(!fullTeam)} hitSlop={8}>
                <Text variant="caption" tone="accent">
                  {fullTeam ? t('common.close') : t('team.viewFull')}
                </Text>
              </Pressable>
            </Row>
            {(fullTeam ? support.data.team : support.data.team.slice(0, 2)).map((s) => (
              <Row key={s.id} gap={spacing.md}>
                <Image source={{ uri: s.avatar }} style={{ width: 40, height: 40, borderRadius: radius.full }} />
                <View style={{ flex: 1 }}>
                  <Text variant="sub">{s.name}</Text>
                  <Text variant="caption" tone="faint">{t(`team.role_${s.role}`)} · {t('common.demo')}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t('team.call')} ${s.name}`}
                  onPress={() => void Linking.openURL(`tel:${s.phone.replace(/[^+\d]/g, '')}`)}
                  hitSlop={8}
                  style={{ padding: spacing.sm }}
                >
                  <Ionicons name="call-outline" size={18} color={colors.accent} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t('team.email')} ${s.name}`}
                  onPress={() => void Linking.openURL(`mailto:${s.email}`)}
                  hitSlop={8}
                  style={{ padding: spacing.sm }}
                >
                  <Ionicons name="mail-outline" size={18} color={colors.accent} />
                </Pressable>
              </Row>
            ))}
            <Text variant="caption" tone="faint">{t('team.note')}</Text>
          </Card>
        ) : null}

        {canAdvance ? (
          <View
            style={{
              borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border,
              borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs, alignItems: 'flex-start',
            }}
          >
            <Badge tone="neutral" icon="flask-outline" label={t('common.demo')} />
            <Button
              label={t('applications.advanceDemo')}
              variant="ghost"
              size="sm"
              icon="play-forward-outline"
              onPress={() => advanceStatus(application.id)}
            />
          </View>
        ) : null}
      </View>

      <UpgradeSheet visible={upgrade !== null} context={upgrade ?? 'generic'} onClose={() => setUpgrade(null)} />
      <DepositModal
        visible={depositOpen}
        course={course}
        institution={institution}
        onClose={() => setDepositOpen(false)}
        onConfirm={() => {
          acceptOffer(application.id);
          hapticSuccess();
          setDepositOpen(false);
        }}
      />
    </Screen>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { goBack } from '@/services/nav';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { fonts, radius, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useTheme } from '@/hooks/useTheme';
import { getSupportBundle, listInstitutions } from '@/services/api';
import { LockChip, UpgradeSheet } from '@/components/plan/UpgradeSheet';
import { useApplicationsStore } from '@/store/useApplicationsStore';
import { useMailStore } from '@/store/useMailStore';
import { usePlan } from '@/store/usePlanStore';
import { toast } from '@/store/useToastStore';
import type { MailKind, UniversityMail } from '@/types/models';
import { useState } from 'react';

const FREE_MAIL_LIMIT = 3;

const KIND_TONE: Record<MailKind, 'eligible' | 'borderline' | 'pathway' | 'accent' | 'neutral'> = {
  offer: 'eligible',
  conditional: 'borderline',
  document_request: 'borderline',
  interview: 'pathway',
  event: 'accent',
  newsletter: 'neutral',
};

/** Unified inbox of university mail for the student's applications. */
export default function MailScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const state = useAsync(async () => Promise.all([getSupportBundle(), listInstitutions()]), []);
  const readIds = useMailStore((s) => s.readIds);
  const repliedIds = useMailStore((s) => s.repliedIds);
  const markRead = useMailStore((s) => s.markRead);
  const markReplied = useMailStore((s) => s.markReplied);
  const applications = useApplicationsStore((s) => s.applications);
  const plan = usePlan();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [openMail, setOpenMail] = useState<UniversityMail | null>(null);
  const [draft, setDraft] = useState('');

  if (state.loading) {
    return (
      <Screen edges={['top', 'bottom']}>
        <SkeletonCards count={4} height={96} />
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

  const [bundle, institutions] = state.data;
  const mails = [...bundle.mails].sort((a, b) => b.date.localeCompare(a.date));
  const inst = (id: string) => institutions.find((i) => i.id === id);
  const instName = (id: string) => inst(id)?.short ?? id;

  const closeReader = () => {
    setOpenMail(null);
    setDraft('');
  };
  const openAndNavigate = (path: string) => {
    closeReader();
    router.push(path as never);
  };
  const sendReply = () => {
    if (!openMail || !draft.trim()) return;
    markReplied(openMail.id);
    setDraft('');
    toast(t('mail.replySent', { school: instName(openMail.institutionId) }));
  };

  const openInst = openMail ? inst(openMail.institutionId) : undefined;
  const openHasApp = openMail ? applications.some((a) => a.id === openMail.applicationId) : false;
  const openReplied = openMail ? repliedIds.includes(openMail.id) : false;

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <Row style={{ paddingVertical: spacing.md, gap: spacing.md }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => goBack('/applications')} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="title">{t('mail.title')}</Text>
          <Text variant="caption" tone="secondary">{t('mail.subtitle')}</Text>
        </View>
      </Row>

      <View style={{ gap: spacing.md, paddingBottom: spacing.xxxl }}>
        {mails.map((m, idx) => {
          const unread = !m.read && !readIds.includes(m.id);
          const locked = plan === 'free' && idx >= FREE_MAIL_LIMIT;
          if (locked) {
            return (
              <Card key={m.id} onPress={() => setUpgradeOpen(true)} style={{ gap: 6 }}>
                <View style={{ opacity: 0.35 }} pointerEvents="none">
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text variant="caption" tone="secondary">{instName(m.institutionId)} · {m.date}</Text>
                    <Badge tone={KIND_TONE[m.kind]} label={t(`mail.kind_${m.kind}`)} />
                  </Row>
                  <Text variant="sub">█████ ██████ ███████</Text>
                </View>
                <LockChip onPress={() => setUpgradeOpen(true)} />
              </Card>
            );
          }
          return (
            <Card
              key={m.id}
              onPress={() => {
                markRead(m.id);
                setOpenMail(m);
              }}
              style={{ gap: 6 }}
            >
              <Row style={{ justifyContent: 'space-between' }}>
                <Row gap={spacing.sm} style={{ flex: 1 }}>
                  {unread ? (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} />
                  ) : null}
                  <Text variant="caption" tone="secondary">{instName(m.institutionId)} · {m.date}</Text>
                </Row>
                <Badge tone={KIND_TONE[m.kind]} label={t(`mail.kind_${m.kind}`)} />
              </Row>
              <Text variant="sub" style={unread ? undefined : { opacity: 0.75 }}>{m.subject}</Text>
              <Text variant="caption" tone="faint" numberOfLines={2}>{m.snippet}</Text>
              {repliedIds.includes(m.id) ? (
                <Row gap={4}>
                  <Ionicons name="checkmark-done-outline" size={13} color={colors.accent} />
                  <Text variant="caption" tone="accent">{t('mail.repliedChip')}</Text>
                </Row>
              ) : null}
            </Card>
          );
        })}
        {plan === 'free' && mails.length > FREE_MAIL_LIMIT ? (
          <Text variant="caption" tone="accent" center>{t('pass.lockedMail')}</Text>
        ) : null}
        <Text variant="caption" tone="faint" center>{t('mail.note')}</Text>
      </View>
      <UpgradeSheet visible={upgradeOpen} context="mail" onClose={() => setUpgradeOpen(false)} />

      <Modal visible={!!openMail} animationType="slide" transparent onRequestClose={closeReader}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={closeReader} />
        {openMail ? (
          <View
            style={{
              backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
              maxHeight: '88%',
            }}
          >
            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ padding: spacing.xl, gap: spacing.md }}
            >
              <Row gap={spacing.md}>
                {openInst?.logo ? (
                  <Image
                    source={{ uri: openInst.logo }}
                    style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surfaceAlt }}
                    contentFit="contain"
                  />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text variant="sub">{openInst?.name ?? instName(openMail.institutionId)}</Text>
                  <Text variant="caption" tone="secondary">{t('mail.fromOffice')} · {openMail.date}</Text>
                </View>
                <Badge tone={KIND_TONE[openMail.kind]} label={t(`mail.kind_${openMail.kind}`)} />
              </Row>

              <Text variant="title">{openMail.subject}</Text>
              {openMail.body.split('\n\n').map((p, i) => (
                <Text key={i} variant="body" tone="secondary" style={{ lineHeight: 21 }}>{p}</Text>
              ))}

              <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
                {openMail.kind === 'document_request' ? (
                  <Button
                    label={t('mail.uploadDocs')}
                    icon="cloud-upload-outline"
                    size="lg"
                    onPress={() => openAndNavigate('/vault')}
                  />
                ) : null}
                {(openMail.kind === 'offer' || openMail.kind === 'conditional') && openHasApp ? (
                  <Button
                    label={t('mail.openApplication')}
                    icon="document-text-outline"
                    size="lg"
                    onPress={() => openAndNavigate(`/application/${openMail.applicationId}`)}
                  />
                ) : null}
                {openMail.kind === 'interview' ? (
                  <Button
                    label={t('mail.bookSlot')}
                    icon="calendar-outline"
                    size="lg"
                    onPress={() => toast(t('mail.slotRequested', { school: instName(openMail.institutionId) }))}
                  />
                ) : null}
                <Button
                  label={t('mail.viewSchool')}
                  icon="school-outline"
                  variant="secondary"
                  onPress={() => openAndNavigate(`/institution/${openMail.institutionId}`)}
                />
              </View>
            </ScrollView>

            <View
              style={{
                borderTopWidth: 1, borderTopColor: colors.border,
                padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm,
              }}
            >
              <Row style={{ justifyContent: 'space-between' }}>
                <Text variant="label">{t('mail.replyTitle', { school: instName(openMail.institutionId) })}</Text>
                {openReplied ? (
                  <Row gap={4}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
                    <Text variant="caption" tone="accent">{t('mail.repliedChip')}</Text>
                  </Row>
                ) : null}
              </Row>
              <Row gap={spacing.sm}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  onSubmitEditing={sendReply}
                  placeholder={t('mail.replyPlaceholder')}
                  placeholderTextColor={colors.inkFaint}
                  style={{
                    flex: 1, minHeight: 44, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border,
                    backgroundColor: colors.surface, paddingHorizontal: spacing.lg, color: colors.ink, fontFamily: fonts.regular,
                  }}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('mail.replySend')}
                  onPress={sendReply}
                  disabled={!draft.trim()}
                  style={{
                    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent,
                    alignItems: 'center', justifyContent: 'center', opacity: draft.trim() ? 1 : 0.4,
                  }}
                >
                  <Ionicons name="send" size={18} color={colors.onAccent} />
                </Pressable>
              </Row>
              <Text variant="caption" tone="faint">{t('mail.replyNote')}</Text>
            </View>
          </View>
        ) : null}
      </Modal>
    </Screen>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Row, SectionHeader } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { FLAGS } from '@/constants/countries';
import { radius, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useMatchData } from '@/hooks/useMatchData';
import { useTheme } from '@/hooks/useTheme';
import { listCoursemates, listInstitutions } from '@/services/api';
import { hapticTap } from '@/services/haptics';
import { useApplicationsStore } from '@/store/useApplicationsStore';
import { useCommunityStore } from '@/store/useCommunityStore';
import { useSavedStore } from '@/store/useSavedStore';
import { toast } from '@/store/useToastStore';

/** Friend requests (incoming + waiting) and 1:1 chats, in one tab. */
export default function ChatsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const mateLinks = useCommunityStore((s) => s.mateLinks);
  const mateMessages = useCommunityStore((s) => s.mateMessages);
  const incomingSeeded = useCommunityStore((s) => s.incomingSeeded);
  const seedIncoming = useCommunityStore((s) => s.seedIncoming);
  const acceptRequest = useCommunityStore((s) => s.acceptRequest);
  const declineRequest = useCommunityStore((s) => s.declineRequest);
  const settleRequests = useCommunityStore((s) => s.settleRequests);
  const applications = useApplicationsStore((s) => s.applications);
  const savedCourseIds = useSavedStore((s) => s.savedCourseIds);
  const { matchData } = useMatchData();

  const state = useAsync(async () => Promise.all([listCoursemates(), listInstitutions()]), []);
  const mates = state.data?.[0];
  const institutions = state.data?.[1];

  // Prototype: a couple of admitted students from your school reach out first,
  // so the requests inbox demonstrates the receiving side too.
  useEffect(() => {
    if (incomingSeeded || !mates || !matchData) return;
    const courseInst = (courseId: string) => matchData.resultByCourseId.get(courseId)?.institution.id;
    const anchorId =
      applications.map((a) => courseInst(a.courseId)).find(Boolean) ??
      savedCourseIds.map(courseInst).find(Boolean) ??
      'au-monash';
    const links = useCommunityStore.getState().mateLinks;
    const candidates = mates
      .filter((m) => m.institutionId === anchorId && !links[m.id])
      .slice(1, 3)
      .map((m) => m.id);
    if (candidates.length > 0) seedIncoming(candidates);
  }, [incomingSeeded, mates, matchData, applications, savedCourseIds, seedIncoming]);

  // Outgoing requests auto-accept while this tab is open too.
  useEffect(() => {
    const tick = () => {
      const accepted = settleRequests();
      if (accepted.length > 0 && mates) {
        const names = accepted.map((id) => mates.find((m) => m.id === id)?.name.split(' ')[0]).filter(Boolean).join(', ');
        if (names) toast(t('community.accepted', { name: names }));
      }
    };
    tick();
    const iv = setInterval(tick, 2500);
    return () => clearInterval(iv);
  }, [settleRequests, mates, t]);

  if (state.loading) {
    return (
      <Screen>
        <SkeletonCards count={4} height={80} />
      </Screen>
    );
  }
  if (state.error || !mates || !institutions) {
    return (
      <Screen>
        <ErrorState onRetry={state.retry} />
      </Screen>
    );
  }

  const instName = (id: string) => institutions.find((i) => i.id === id)?.short ?? '';
  const byId = (id: string) => mates.find((m) => m.id === id);
  const incoming = Object.entries(mateLinks).filter(([, l]) => l.status === 'incoming').map(([id]) => byId(id)).filter((m) => !!m);
  const waiting = Object.entries(mateLinks).filter(([, l]) => l.status === 'requested').map(([id]) => byId(id)).filter((m) => !!m);
  const connected = Object.entries(mateLinks)
    .filter(([, l]) => l.status === 'connected')
    .sort(([, a], [, b]) => b.at - a.at)
    .map(([id]) => byId(id))
    .filter((m) => !!m);

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing.lg, paddingTop: spacing.xl }}>
          <Text variant="display">{t('tabs.chats')}</Text>

          <SectionHeader title={t('community.requestsTitle')} />
          {incoming.length === 0 && waiting.length === 0 ? (
            <Card tone="alt">
              <Text variant="caption" tone="secondary">{t('community.requestsEmpty')}</Text>
            </Card>
          ) : null}
          {incoming.map((m) => (
            <Card key={m.id} style={{ gap: spacing.sm }}>
              <Row gap={spacing.md}>
                <Image source={{ uri: m.avatar }} style={{ width: 46, height: 46, borderRadius: radius.full, backgroundColor: colors.surfaceAlt }} />
                <View style={{ flex: 1 }}>
                  <Text variant="label">{m.name}</Text>
                  <Text variant="caption" tone="faint" numberOfLines={1}>
                    {FLAGS[m.homeCountry]} {instName(m.institutionId)} · {m.courseName}
                  </Text>
                  <Text variant="caption" tone="secondary">{t('community.incomingNote', { name: m.name.split(' ')[0] })}</Text>
                </View>
              </Row>
              <Row gap={spacing.sm}>
                <View style={{ flex: 1 }}>
                  <Button
                    label={t('community.accept')}
                    size="sm"
                    icon="checkmark"
                    onPress={() => {
                      hapticTap();
                      acceptRequest(m.id);
                      toast(t('community.accepted', { name: m.name.split(' ')[0] }));
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label={t('community.decline')} size="sm" variant="secondary" onPress={() => declineRequest(m.id)} />
                </View>
              </Row>
            </Card>
          ))}
          {waiting.map((m) => (
            <Card key={m.id} tone="alt" style={{ gap: 2 }}>
              <Row gap={spacing.md}>
                <Image source={{ uri: m.avatar }} style={{ width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.surfaceAlt }} />
                <View style={{ flex: 1 }}>
                  <Text variant="label">{m.name}</Text>
                  <Row gap={6}>
                    <Ionicons name="hourglass-outline" size={13} color={colors.inkFaint} />
                    <Text variant="caption" tone="faint">{t('community.waitingApproval')}</Text>
                  </Row>
                </View>
              </Row>
            </Card>
          ))}

          <SectionHeader title={t('community.chatsTitle')} />
          {connected.length === 0 ? (
            <EmptyState icon="chatbubbles-outline" title={t('community.chatsEmpty')} />
          ) : null}
          {connected.map((m) => {
            const msgs = mateMessages[m.id] ?? [];
            const last = msgs[msgs.length - 1];
            return (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                onPress={() => router.push(`/mate/${m.id}`)}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: spacing.md,
                  backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
                  padding: spacing.lg, opacity: pressed ? 0.85 : 1,
                })}
              >
                <Image source={{ uri: m.avatar }} style={{ width: 48, height: 48, borderRadius: radius.full, backgroundColor: colors.surfaceAlt }} />
                <View style={{ flex: 1 }}>
                  <Text variant="label">{m.name}</Text>
                  <Text variant="caption" tone="faint" numberOfLines={1}>
                    {last ? `${last.mine ? t('community.you') + ': ' : ''}${last.text}` : t('community.chatIntro', { name: m.name.split(' ')[0] })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

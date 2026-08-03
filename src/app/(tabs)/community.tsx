import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Row } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { FLAGS } from '@/constants/countries';
import { radius, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useTheme } from '@/hooks/useTheme';
import { listAmbassadors, listCoursemates, listEvents, listInstitutions, listIntakeGroups } from '@/services/api';
import { useCommunityStore } from '@/store/useCommunityStore';

type Segment = 'groups' | 'feed' | 'mates' | 'events';

export default function CommunityScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [segment, setSegment] = useState<Segment>('groups');
  const joinedGroupIds = useCommunityStore((s) => s.joinedGroupIds);
  const joinGroup = useCommunityStore((s) => s.joinGroup);
  const connections = useCommunityStore((s) => s.connections);
  const toggleConnection = useCommunityStore((s) => s.toggleConnection);
  const rsvps = useCommunityStore((s) => s.rsvps);
  const toggleRsvp = useCommunityStore((s) => s.toggleRsvp);

  const state = useAsync(async () =>
    Promise.all([listIntakeGroups(), listAmbassadors(), listCoursemates(), listEvents(), listInstitutions()]),
  );

  const feed = useMemo(() => {
    const ambassadors = state.data?.[1] ?? [];
    return ambassadors
      .flatMap((a) => a.posts.map((p) => ({ ambassador: a, post: p })))
      .sort((a, b) => b.post.date.localeCompare(a.post.date));
  }, [state.data]);

  if (state.loading) {
    return (
      <Screen>
        <SkeletonCards count={4} height={120} />
      </Screen>
    );
  }
  if (state.error || !state.data) {
    return (
      <Screen>
        <ErrorState onRetry={state.retry} />
      </Screen>
    );
  }

  const [groups, , mates, events, institutions] = state.data;
  const instName = (id: string) => institutions.find((i) => i.id === id)?.name ?? '';
  const sortedGroups = [...groups].sort(
    (a, b) => Number(joinedGroupIds.includes(b.id)) - Number(joinedGroupIds.includes(a.id)),
  );

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing.lg, paddingTop: spacing.xl }}>
          <Row gap={spacing.sm}>
            <Text variant="display">{t('community.title')}</Text>
            <Badge tone="accent" label={t('common.beta')} />
          </Row>

          <Card tone="alt" onPress={() => router.push('/arrival')} style={{ gap: 4 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={spacing.sm}>
                <Ionicons name="rocket-outline" size={18} color={colors.accent} />
                <Text variant="label">{t('community.arrivalTitle')}</Text>
              </Row>
              <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
            </Row>
            <Text variant="caption" tone="secondary">{t('community.arrivalTeaser')}</Text>
          </Card>

          <Row gap={spacing.sm} wrap>
            {(['groups', 'feed', 'mates', 'events'] as const).map((s) => (
              <Chip key={s} label={t(`community.${s}`)} selected={segment === s} onPress={() => setSegment(s)} />
            ))}
          </Row>

          {segment === 'groups' ? (
            <View style={{ gap: spacing.md }}>
              {sortedGroups.length === 0 ? (
                <EmptyState icon="chatbubbles-outline" title={t('community.emptyGroups')} />
              ) : null}
              {sortedGroups.map((g) => {
                const joined = joinedGroupIds.includes(g.id);
                return (
                  <Card key={g.id} onPress={joined ? () => router.push(`/group/${g.id}`) : undefined} style={{ gap: spacing.xs }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Text variant="sub" style={{ flex: 1 }}>{g.name}</Text>
                      {joined ? (
                        <Badge tone="eligible" icon="checkmark" label={t('community.joined')} />
                      ) : (
                        <Button label={t('community.join')} size="sm" variant="secondary" onPress={() => joinGroup(g.id)} />
                      )}
                    </Row>
                    <Text variant="caption" tone="secondary">{instName(g.institutionId)}</Text>
                    <Text variant="caption" tone="faint">{t('common.members', { count: g.members })}</Text>
                  </Card>
                );
              })}
            </View>
          ) : null}

          {segment === 'feed' ? (
            <View style={{ gap: spacing.md }}>
              {feed.length === 0 ? <EmptyState icon="images-outline" title={t('community.emptyFeed')} /> : null}
              {feed.map(({ ambassador, post }) => (
                <Card key={post.id} padded={false}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push(`/ambassador/${ambassador.id}`)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg }}
                  >
                    <Image source={{ uri: ambassador.avatar }} style={{ width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.surfaceAlt }} />
                    <View style={{ flex: 1 }}>
                      <Row gap={6}>
                        <Text variant="label">{ambassador.name}</Text>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => Alert.alert(t('community.verifiedStudent'), t('community.verifiedExplainer'))}
                          hitSlop={8}
                        >
                          <Ionicons name="checkmark-circle" size={15} color={colors.accent} />
                        </Pressable>
                      </Row>
                      <Text variant="caption" tone="faint" numberOfLines={1}>
                        {FLAGS[ambassador.homeCountry]} {instName(ambassador.institutionId)}
                      </Text>
                    </View>
                    <Text variant="caption" tone="faint">{post.date.slice(5)}</Text>
                  </Pressable>
                  <Image source={{ uri: post.image }} style={{ width: '100%', height: 200 }} contentFit="cover" transition={200} />
                  <View style={{ padding: spacing.lg, gap: spacing.xs }}>
                    <Text variant="body">{post.text}</Text>
                    <Row gap={5}>
                      <Ionicons name="heart" size={14} color={colors.danger} />
                      <Text variant="caption" tone="faint">{t('common.likes', { count: post.likes })}</Text>
                    </Row>
                  </View>
                </Card>
              ))}
            </View>
          ) : null}

          {segment === 'mates' ? (
            <View style={{ gap: spacing.md }}>
              <Text variant="caption" tone="secondary">{t('community.matesSubtitle')}</Text>
              {mates.length === 0 ? <EmptyState icon="people-outline" title={t('community.emptyMates')} /> : null}
              <Row wrap gap={spacing.md}>
                {mates.map((m) => {
                  const connected = connections.includes(m.id);
                  return (
                    <View
                      key={m.id}
                      style={{
                        flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
                        borderWidth: 1, borderColor: colors.border, padding: spacing.lg, alignItems: 'center', gap: spacing.sm,
                      }}
                    >
                      <Image source={{ uri: m.avatar }} style={{ width: 64, height: 64, borderRadius: radius.full, backgroundColor: colors.surfaceAlt }} />
                      <Text variant="label" center numberOfLines={1}>{m.name}</Text>
                      <Text variant="caption" tone="faint" center numberOfLines={2}>
                        {FLAGS[m.homeCountry]} · {m.courseName}
                      </Text>
                      <Button
                        label={connected ? t('community.connected') : t('community.connect')}
                        size="sm"
                        variant={connected ? 'secondary' : 'primary'}
                        icon={connected ? 'checkmark' : 'person-add-outline'}
                        onPress={() => toggleConnection(m.id)}
                      />
                    </View>
                  );
                })}
              </Row>
            </View>
          ) : null}

          {segment === 'events' ? (
            <View style={{ gap: spacing.md }}>
              {events.length === 0 ? <EmptyState icon="calendar-outline" title={t('community.emptyEvents')} /> : null}
              {events.map((e) => {
                const going = rsvps.includes(e.id);
                return (
                  <Card key={e.id} padded={false}>
                    <Image source={{ uri: e.image }} style={{ width: '100%', height: 120 }} contentFit="cover" transition={200} />
                    <View style={{ padding: spacing.lg, gap: spacing.xs }}>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <Text variant="sub" style={{ flex: 1 }}>{e.title}</Text>
                        <Row gap={4}>
                          {e.kind === 'expo' ? <Badge tone="accent" icon="business" label={t('community.expo')} /> : null}
                          {e.sponsored ? <Badge tone="verified" label={t('community.sponsored')} /> : null}
                        </Row>
                      </Row>
                      <Text variant="caption" tone="secondary">
                        {FLAGS[e.country]} {e.city} · {e.date} · {e.venue}
                      </Text>
                      <Text variant="caption" tone="faint">{e.description}</Text>
                      <Button
                        label={going ? t('community.rsvped') : t('community.rsvp')}
                        size="sm"
                        variant={going ? 'secondary' : 'primary'}
                        icon={going ? 'checkmark' : 'calendar-outline'}
                        onPress={() => toggleRsvp(e.id)}
                        style={{ alignSelf: 'flex-start', marginTop: spacing.xs }}
                      />
                    </View>
                  </Card>
                );
              })}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

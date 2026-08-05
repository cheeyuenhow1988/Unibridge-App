import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, Pressable, ScrollView, Switch, View } from 'react-native';
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
import { useMatchData } from '@/hooks/useMatchData';
import { useTheme } from '@/hooks/useTheme';
import { getSupportBundle, listAmbassadors, listCoursemates, listEvents, listInstitutions, listIntakeGroups } from '@/services/api';
import { hapticTap } from '@/services/haptics';
import { useApplicationsStore } from '@/store/useApplicationsStore';
import { useCommunityStore } from '@/store/useCommunityStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useSavedStore } from '@/store/useSavedStore';
import { toast } from '@/store/useToastStore';
import type { Coursemate, Short } from '@/types/models';

type Segment = 'groups' | 'feed' | 'mates' | 'events';

export default function CommunityScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [segment, setSegment] = useState<Segment>('groups');
  const [playing, setPlaying] = useState<Short | null>(null);
  const [mateSheet, setMateSheet] = useState<Coursemate | null>(null);
  const mateVisible = useProfileStore((s) => s.mateVisible);
  const setMateVisible = useProfileStore((s) => s.setMateVisible);
  const mateShowCourse = useProfileStore((s) => s.mateShowCourse);
  const setMateShowCourse = useProfileStore((s) => s.setMateShowCourse);
  const [shortFilter, setShortFilter] = useState<'all' | 'campus' | 'reality'>('all');
  const supportB = useAsync(() => getSupportBundle(), []);
  const joinedGroupIds = useCommunityStore((s) => s.joinedGroupIds);
  const joinGroup = useCommunityStore((s) => s.joinGroup);
  const mateLinks = useCommunityStore((s) => s.mateLinks);
  const requestConnect = useCommunityStore((s) => s.requestConnect);
  const settleRequests = useCommunityStore((s) => s.settleRequests);
  const unfriend = useCommunityStore((s) => s.unfriend);
  const block = useCommunityStore((s) => s.block);
  const unblock = useCommunityStore((s) => s.unblock);
  const rsvps = useCommunityStore((s) => s.rsvps);
  const toggleRsvp = useCommunityStore((s) => s.toggleRsvp);
  const likedPostIds = useCommunityStore((s) => s.likedPostIds);
  const toggleLike = useCommunityStore((s) => s.toggleLike);
  const applications = useApplicationsStore((s) => s.applications);
  const savedCourseIds = useSavedStore((s) => s.savedCourseIds);
  const { matchData } = useMatchData();

  const state = useAsync(async () =>
    Promise.all([listIntakeGroups(), listAmbassadors(), listCoursemates(), listEvents(), listInstitutions()]),
  );

  const feed = useMemo(() => {
    const ambassadors = state.data?.[1] ?? [];
    return ambassadors
      .flatMap((a) => a.posts.map((p) => ({ ambassador: a, post: p })))
      .sort((a, b) => b.post.date.localeCompare(a.post.date));
  }, [state.data]);

  // Connection requests auto-accept a few seconds later (prototype) — settle
  // while the screen is open so the "accepted" moment happens live.
  useEffect(() => {
    const matesData = state.data?.[2];
    const tick = () => {
      const accepted = settleRequests();
      if (accepted.length > 0 && matesData) {
        const names = accepted
          .map((id) => matesData.find((m) => m.id === id)?.name.split(' ')[0])
          .filter(Boolean)
          .join(', ');
        if (names) toast(t('community.accepted', { name: names }));
      }
    };
    tick();
    const iv = setInterval(tick, 2500);
    return () => clearInterval(iv);
  }, [settleRequests, state.data, t]);

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

          <Card onPress={() => router.push('/safety')} style={{ gap: 2 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={spacing.sm}>
                <Ionicons name="shield-checkmark" size={18} color="#0E7490" />
                <Text variant="label">{t('safety.title')}</Text>
              </Row>
              <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
            </Row>
            <Text variant="caption" tone="secondary">{t('safety.commSub')}</Text>
          </Card>

          <Row gap={spacing.sm} wrap>
            {(['groups', 'feed', 'mates', 'events'] as const).map((s) => (
              <Chip key={s} label={t(`community.${s}`)} selected={segment === s} onPress={() => setSegment(s)} />
            ))}
          </Row>

          {segment === 'groups' ? (
            <View style={{ gap: spacing.md }}>
              <Text variant="caption" tone="secondary">{t('community.groupsExplainer')}</Text>
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
              {(supportB.data?.shorts.length ?? 0) > 0 ? (
                <View style={{ gap: spacing.sm }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text variant="label">{t('shorts.title')}</Text>
                    <Badge tone="accent" label={t('common.beta')} />
                  </Row>
                  <Row gap={spacing.sm}>
                    {(['all', 'campus', 'reality'] as const).map((f) => (
                      <Chip
                        key={f}
                        small
                        label={t(`shorts.filter_${f}`)}
                        selected={shortFilter === f}
                        onPress={() => setShortFilter(f)}
                      />
                    ))}
                  </Row>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                    {(supportB.data?.shorts ?? [])
                      .filter((sh) => (shortFilter === 'all' ? true : shortFilter === 'reality' ? sh.reality : !sh.reality))
                      .map((s) => (
                      <Pressable key={s.id} accessibilityRole="button" onPress={() => setPlaying(s)}>
                        <View style={{ width: 116, gap: 4 }}>
                          <View style={{ borderRadius: radius.lg, overflow: 'hidden' }}>
                            <Image source={{ uri: s.thumb }} style={{ width: 116, height: 176 }} contentFit="cover" />
                            <View
                              style={{
                                position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 4,
                                backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2,
                              }}
                            >
                              <Ionicons name="play" size={10} color="#FFFFFF" />
                              <Text variant="caption" color="#FFFFFF">{s.duration}s</Text>
                            </View>
                            {s.reality ? (
                              <View
                                style={{
                                  position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.7)',
                                  borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2,
                                }}
                              >
                                <Text variant="micro" color="#F2C14E">{t('shorts.realityTag').toUpperCase()}</Text>
                              </View>
                            ) : null}
                          </View>
                          <Text variant="caption" numberOfLines={2}>{s.title}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
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
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: likedPostIds.includes(post.id) }}
                      hitSlop={8}
                      onPress={() => {
                        hapticTap();
                        toggleLike(post.id);
                      }}
                      style={{ alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' }}
                    >
                      <Row gap={5}>
                        <Ionicons
                          name={likedPostIds.includes(post.id) ? 'heart' : 'heart-outline'}
                          size={16}
                          color={likedPostIds.includes(post.id) ? colors.danger : colors.inkFaint}
                        />
                        <Text variant="caption" tone="faint">
                          {t('common.likes', { count: post.likes + (likedPostIds.includes(post.id) ? 1 : 0) })}
                        </Text>
                      </Row>
                    </Pressable>
                  </View>
                </Card>
              ))}
            </View>
          ) : null}

          {segment === 'mates' ? (() => {
            // Anchor to the school the student is actually heading to: latest
            // application first, then the most recent saved course, else a
            // labelled sample school.
            const courseInst = (courseId: string) =>
              matchData?.resultByCourseId.get(courseId)?.institution.id;
            const anchorId =
              applications.map((a) => courseInst(a.courseId)).find(Boolean) ??
              savedCourseIds.map(courseInst).find(Boolean) ??
              'au-monash';
            const anchorInst = institutions.find((i) => i.id === anchorId);
            const isSample = applications.length === 0 && savedCourseIds.length === 0;
            // Blocked people disappear from every list.
            const notBlocked = (m: Coursemate) => mateLinks[m.id]?.status !== 'blocked';
            const atSchool = mates.filter((m) => m.institutionId === anchorId && notBlocked(m));
            const sameCityIds = new Set(
              institutions.filter((i) => i.city === anchorInst?.city && i.id !== anchorId).map((i) => i.id),
            );
            const nearby = mates.filter((m) => sameCityIds.has(m.institutionId) && notBlocked(m)).slice(0, 6);

            const mateCard = (m: Coursemate) => {
              const status = mateLinks[m.id]?.status;
              return (
                <Pressable
                  key={m.id}
                  accessibilityRole="button"
                  onPress={() => setMateSheet(m)}
                  style={({ pressed }) => ({
                    flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
                    borderWidth: 1, borderColor: colors.border, padding: spacing.lg, alignItems: 'center', gap: spacing.sm,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Image source={{ uri: m.avatar }} style={{ width: 64, height: 64, borderRadius: radius.full, backgroundColor: colors.surfaceAlt }} />
                  <Text variant="label" center numberOfLines={1}>{m.name}</Text>
                  <Text variant="caption" tone="faint" center numberOfLines={2}>
                    {FLAGS[m.homeCountry]} · {m.courseName}
                  </Text>
                  <Text variant="micro" tone="faint" center numberOfLines={1}>{instName(m.institutionId)}</Text>
                  {status === 'connected' ? (
                    <Button
                      label={t('community.chatBtn')}
                      size="sm"
                      icon="chatbubble-ellipses-outline"
                      onPress={() => router.push(`/mate/${m.id}`)}
                    />
                  ) : status === 'requested' ? (
                    <Button label={t('community.requestedBtn')} size="sm" variant="secondary" icon="hourglass-outline" disabled />
                  ) : (
                    <Button
                      label={t('community.connect')}
                      size="sm"
                      icon="person-add-outline"
                      onPress={() => {
                        hapticTap();
                        requestConnect(m.id);
                        toast(t('community.requestSent', { name: m.name.split(' ')[0] }));
                      }}
                    />
                  )}
                </Pressable>
              );
            };

            return (
              <View style={{ gap: spacing.md }}>
                <Card style={{ gap: spacing.sm }}>
                  <Text variant="label">{t('community.myVisibility')}</Text>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, paddingRight: spacing.md }}>
                      <Text variant="bodyMedium">{t('community.visibleToggle')}</Text>
                      <Text variant="caption" tone="faint">{t('community.visibleSub')}</Text>
                    </View>
                    <Switch value={mateVisible} onValueChange={setMateVisible} />
                  </Row>
                  <Row style={{ justifyContent: 'space-between', opacity: mateVisible ? 1 : 0.45 }}>
                    <View style={{ flex: 1, paddingRight: spacing.md }}>
                      <Text variant="bodyMedium">{t('community.showCourseToggle')}</Text>
                      <Text variant="caption" tone="faint">{t('community.showCourseSub')}</Text>
                    </View>
                    <Switch value={mateShowCourse && mateVisible} onValueChange={setMateShowCourse} disabled={!mateVisible} />
                  </Row>
                  {!mateVisible ? (
                    <Row gap={spacing.sm} style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md }}>
                      <Ionicons name="eye-off-outline" size={16} color={colors.inkSecondary} />
                      <Text variant="caption" tone="secondary" style={{ flex: 1 }}>{t('community.invisibleBanner')}</Text>
                    </Row>
                  ) : null}
                </Card>
                <Text variant="caption" tone="secondary">
                  {isSample
                    ? t('community.matesSample', { school: anchorInst?.name ?? '' })
                    : t('community.matesAnchor', { school: anchorInst?.name ?? '' })}
                </Text>
                <Text variant="label">{t('community.matesAt', { school: anchorInst?.short ?? '' })}</Text>
                {atSchool.length === 0 ? <EmptyState icon="people-outline" title={t('community.emptyMates')} /> : null}
                <Row wrap gap={spacing.md}>{atSchool.map(mateCard)}</Row>
                {nearby.length > 0 ? (
                  <>
                    <Text variant="label" style={{ marginTop: spacing.sm }}>
                      {t('community.matesNearby', { city: anchorInst?.city ?? '' })}
                    </Text>
                    <Row wrap gap={spacing.md}>{nearby.map(mateCard)}</Row>
                  </>
                ) : null}
              </View>
            );
          })() : null}

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
                        onPress={() => {
                          hapticTap();
                          toggleRsvp(e.id);
                        }}
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

      {playing ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          onPress={() => setPlaying(null)}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <View style={{ width: '78%', maxWidth: 340, gap: spacing.md }}>
            <View style={{ borderRadius: radius.xl, overflow: 'hidden' }}>
              <Image source={{ uri: playing.thumb }} style={{ width: '100%', aspectRatio: 9 / 16 }} contentFit="cover" />
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                <View
                  style={{
                    width: 64, height: 64, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.25)',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Ionicons name="play" size={30} color="#FFFFFF" />
                </View>
              </View>
            </View>
            <Text variant="sub" color="#FFFFFF" center>{playing.title}</Text>
            <Text variant="caption" color="rgba(255,255,255,0.7)" center>
              {playing.duration}s · {playing.views.toLocaleString('en')} {t('shorts.views')} · {t('shorts.mockNote')}
            </Text>
          </View>
        </Pressable>
      ) : null}

      <Modal visible={!!mateSheet} animationType="slide" transparent onRequestClose={() => setMateSheet(null)}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={() => setMateSheet(null)} />
        {mateSheet ? (
          <View
            style={{
              backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
              padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.md, alignItems: 'center',
            }}
          >
            <Image source={{ uri: mateSheet.avatar }} style={{ width: 96, height: 96, borderRadius: radius.full, backgroundColor: colors.surfaceAlt }} />
            <Text variant="title" center>{mateSheet.name}</Text>
            <Text variant="caption" tone="secondary" center>
              {FLAGS[mateSheet.homeCountry]} {mateSheet.age
                ? t('community.aboutAge', { age: mateSheet.age, country: t(`countries.${mateSheet.homeCountry}`) })
                : t(`countries.${mateSheet.homeCountry}`)}
            </Text>
            <View style={{ alignSelf: 'stretch', gap: spacing.xs, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: spacing.lg }}>
              <Row gap={spacing.sm}>
                <Ionicons name="school-outline" size={15} color={colors.accent} />
                <Text variant="caption" style={{ flex: 1 }}>{mateSheet.courseName} · {instName(mateSheet.institutionId)}</Text>
              </Row>
            </View>
            {mateSheet.lookingFor?.length ? (
              <View style={{ alignSelf: 'stretch', gap: spacing.sm }}>
                <Text variant="micro" tone="faint" style={{ letterSpacing: 1.5 }}>{t('community.lookingTitle').toUpperCase()}</Text>
                <Row wrap gap={spacing.sm}>
                  {mateSheet.lookingFor.map((k) => (
                    <View key={k} style={{ backgroundColor: colors.accentSoft, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 5 }}>
                      <Text variant="caption" color={colors.accent}>{t(`community.looking_${k}`)}</Text>
                    </View>
                  ))}
                </Row>
              </View>
            ) : null}
            {(() => {
              const status = mateLinks[mateSheet.id]?.status;
              if (status === 'connected') {
                return (
                  <View style={{ alignSelf: 'stretch', gap: spacing.sm }}>
                    <Button
                      label={t('community.chatBtn')}
                      icon="chatbubble-ellipses-outline"
                      size="lg"
                      onPress={() => {
                        setMateSheet(null);
                        router.push(`/mate/${mateSheet.id}`);
                      }}
                    />
                    <Row gap={spacing.sm}>
                      <View style={{ flex: 1 }}>
                        <Button
                          label={t('community.unfriend')}
                          icon="person-remove-outline"
                          variant="secondary"
                          size="sm"
                          onPress={() => {
                            unfriend(mateSheet.id);
                            toast(t('community.unfriended', { name: mateSheet.name.split(' ')[0] }));
                            setMateSheet(null);
                          }}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button
                          label={t('community.block')}
                          icon="hand-left-outline"
                          variant="secondary"
                          size="sm"
                          onPress={() => {
                            block(mateSheet.id);
                            toast(t('community.blocked', { name: mateSheet.name.split(' ')[0] }));
                            setMateSheet(null);
                          }}
                        />
                      </View>
                    </Row>
                  </View>
                );
              }
              if (status === 'requested') {
                return <Button label={t('community.requestedBtn')} icon="hourglass-outline" variant="secondary" size="lg" disabled />;
              }
              if (status === 'blocked') {
                return (
                  <Button
                    label={t('community.unblock')}
                    icon="hand-right-outline"
                    variant="secondary"
                    size="lg"
                    onPress={() => {
                      unblock(mateSheet.id);
                      setMateSheet(null);
                    }}
                  />
                );
              }
              return (
                <Button
                  label={t('community.connect')}
                  icon="person-add-outline"
                  size="lg"
                  onPress={() => {
                    hapticTap();
                    requestConnect(mateSheet.id);
                    toast(t('community.requestSent', { name: mateSheet.name.split(' ')[0] }));
                    setMateSheet(null);
                  }}
                />
              );
            })()}
          </View>
        ) : null}
      </Modal>
    </Screen>
  );
}

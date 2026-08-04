import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { HexBadge } from '@/components/rewards/HexBadge';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Row, SectionHeader } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useTheme } from '@/hooks/useTheme';
import { getSupportBundle } from '@/services/api';
import { toast } from '@/store/useToastStore';
import { useApplicationsStore } from '@/store/useApplicationsStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useRewardsStore } from '@/store/useRewardsStore';
import { useVaultStore } from '@/store/useVaultStore';

type Tab = 'coins' | 'badges' | 'streak';

const BADGES: { id: string; icon: keyof typeof Ionicons.glyphMap; colors: [string, string] }[] = [
  { id: 'explorer', icon: 'compass', colors: ['#0C6EAA', '#3FA0D8'] },
  { id: 'aspirant', icon: 'create', colors: ['#7C3AED', '#A78BFA'] },
  { id: 'prepper', icon: 'folder-open', colors: ['#DC2626', '#F97316'] },
  { id: 'applicant', icon: 'paper-plane', colors: ['#2447DB', '#5B7BFF'] },
  { id: 'offer', icon: 'ribbon', colors: ['#B45309', '#F5A623'] },
  { id: 'grad', icon: 'school', colors: ['#9D174D', '#EC4899'] },
];

const NAVY: [string, string] = ['#1B2A5B', '#0D1433'];
const STARS = [
  [12, 18, 2.5], [30, 8, 1.5], [52, 22, 2], [70, 10, 1.5], [86, 26, 2.5],
  [22, 44, 1.5], [62, 40, 1.5], [90, 52, 2], [8, 60, 2], [44, 6, 1.5],
] as const;

function HeroBanner({ title, subtitle, icon }: { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <LinearGradient colors={NAVY} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, overflow: 'hidden' }}>
      <View style={{ padding: spacing.xl, minHeight: 128, justifyContent: 'center' }}>
        {STARS.map(([x, y, s], i) => (
          <View
            key={i}
            style={{
              position: 'absolute', left: `${x}%`, top: `${y}%`, width: s * 2, height: s * 2,
              borderRadius: s, backgroundColor: 'rgba(255,255,255,0.8)', opacity: 0.7,
            }}
          />
        ))}
        <View style={{ position: 'absolute', right: 18, top: 16 }}>
          <Ionicons name={icon} size={64} color="#7FD8E8" style={{ transform: [{ rotate: '-20deg' }] }} />
        </View>
        {/* cloud puffs */}
        <View style={{ position: 'absolute', bottom: -26, left: -10, width: 110, height: 60, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.14)' }} />
        <View style={{ position: 'absolute', bottom: -30, left: 70, width: 150, height: 66, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.10)' }} />
        <View style={{ position: 'absolute', bottom: -24, right: -16, width: 130, height: 58, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.14)' }} />
        <View style={{ gap: 4, maxWidth: '68%' }}>
          <Text variant="title" color="#FFFFFF">{title}</Text>
          <Text variant="caption" color="rgba(255,255,255,0.75)">{subtitle}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

export default function RewardsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('coins');
  const [showAllHistory, setShowAllHistory] = useState(false);
  const bundle = useAsync(() => getSupportBundle(), []);
  const coins = useRewardsStore((s) => s.coins);
  const history = useRewardsStore((s) => s.history);
  const redeemedIds = useRewardsStore((s) => s.redeemedIds);
  const streak = useRewardsStore((s) => s.streak);
  const lastCheckIn = useRewardsStore((s) => s.lastCheckIn);
  const redeem = useRewardsStore((s) => s.redeem);
  const checkIn = useRewardsStore((s) => s.checkIn);

  const profile = useProfileStore((s) => s.profile);
  const documents = useVaultStore((s) => s.documents);
  const applications = useApplicationsStore((s) => s.applications);

  const earned = new Set<string>();
  if (profile) earned.add('explorer');
  if (profile && (profile.grades.subjects?.length || profile.grades.total !== undefined)) earned.add('aspirant');
  if (documents.length >= 4) earned.add('prepper');
  if (applications.length > 0) earned.add('applicant');
  if (applications.some((a) => ['conditional_offer', 'offer', 'accepted', 'coe_issued'].includes(a.status))) earned.add('offer');
  if (applications.some((a) => ['accepted', 'coe_issued'].includes(a.status))) earned.add('grad');

  const [detail, setDetail] = useState<string | null>(null);
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const checkedToday = lastCheckIn === todayISO;
  const checkedDates = new Set(history.filter((h) => h.labelId === 'rule_daily').map((h) => h.date));
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getTime() - (6 - i) * 86400000);
    return { iso: d.toISOString().slice(0, 10), label: 'SMTWTFS'[d.getDay()] };
  });

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <Row style={{ paddingVertical: spacing.md, gap: spacing.md, justifyContent: 'space-between' }}>
        <Row gap={spacing.md}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Pressable>
          <Text variant="title">{t('rewards.title')}</Text>
        </Row>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('rewards.historyTitle')}
          onPress={() => { setTab('coins'); setShowAllHistory(true); }}
          hitSlop={10}
        >
          <Ionicons name="time-outline" size={22} color={colors.inkSecondary} />
        </Pressable>
      </Row>

      {/* Underline segment tabs */}
      <Row style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing.lg }}>
        {(['coins', 'badges', 'streak'] as const).map((k) => (
          <Pressable
            key={k}
            accessibilityRole="button"
            onPress={() => setTab(k)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.md }}
          >
            <Text variant="label" tone={tab === k ? 'accent' : 'faint'}>{t(`rewards.tab_${k}`)}</Text>
            <View
              style={{
                height: 3, borderRadius: 2, marginTop: spacing.sm, alignSelf: 'stretch',
                marginHorizontal: spacing.xl, backgroundColor: tab === k ? colors.accent : 'transparent',
              }}
            />
          </Pressable>
        ))}
      </Row>

      {tab === 'coins' ? (
        <View style={{ gap: spacing.lg }}>
          <LinearGradient
            colors={[colors.gradientFrom, colors.gradientTo]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: radius.xl, padding: spacing.xl }}
          >
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ gap: 4 }}>
                <Text variant="caption" color="rgba(255,255,255,0.8)">{t('rewards.balance')}</Text>
                <Row gap={spacing.sm}>
                  <Text variant="display" color="#FFFFFF">🪙 {coins}</Text>
                </Row>
                <Text variant="caption" color="rgba(255,255,255,0.8)">{t('rewards.earnHint')}</Text>
              </View>
              <Ionicons name="sparkles" size={40} color="rgba(255,255,255,0.35)" />
            </Row>
          </LinearGradient>

          <SectionHeader title={t('rewards.redeemTitle')} />
          <View style={{ gap: spacing.md }}>
            {(bundle.data?.redemptions ?? []).map((r) => {
              const done = redeemedIds.includes(r.id);
              return (
                <Card key={r.id} style={{ gap: 4 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text variant="sub" style={{ flex: 1 }}>{t(`rewards.item_${r.id}`)}</Text>
                    {done ? <Badge tone="eligible" icon="checkmark" label={t('rewards.redeemed')} /> : null}
                  </Row>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text variant="caption" tone="accent">🪙 {r.coins}</Text>
                    {!done ? (
                      <Chip
                        small
                        label={t('rewards.redeem')}
                        onPress={() => {
                          const ok = redeem(r.id, r.coins);
                          toast(ok ? t('rewards.redeemOk') : t('rewards.redeemNo'));
                        }}
                      />
                    ) : null}
                  </Row>
                </Card>
              );
            })}
          </View>

          <SectionHeader title={t('rewards.earnTitle')} />
          <Card style={{ gap: spacing.sm }}>
            {(bundle.data?.coinRules ?? []).map((rule) => (
              <Row key={rule.id} style={{ justifyContent: 'space-between' }}>
                <Text variant="caption" tone="secondary">{t(`rewards.rule_${rule.id}`)}</Text>
                <Text variant="caption" tone="accent">+{rule.coins}</Text>
              </Row>
            ))}
          </Card>

          <SectionHeader title={t('rewards.historyTitle')} />
          {history.length === 0 ? (
            <Text variant="caption" tone="faint">{t('rewards.historyEmpty')}</Text>
          ) : (
            <Card style={{ gap: spacing.sm }}>
              {(showAllHistory ? history : history.slice(0, 8)).map((h) => (
                <Row key={h.id} style={{ justifyContent: 'space-between' }}>
                  <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
                    {t(`rewards.${h.labelId}`)} · {h.date}
                  </Text>
                  <Text variant="caption" tone={h.delta >= 0 ? 'accent' : 'secondary'}>
                    {h.delta >= 0 ? '+' : ''}{h.delta}
                  </Text>
                </Row>
              ))}
            </Card>
          )}
        </View>
      ) : null}

      {tab === 'badges' ? (
        <View style={{ gap: spacing.lg }}>
          <HeroBanner title={t('rewards.tab_badges')} subtitle={t('rewards.badgesHero')} icon="rocket" />
          <View style={{ gap: 2 }}>
            <Text variant="heading">{t('rewards.badgesEarnedShort', { count: earned.size })}</Text>
            <Text variant="caption" tone="faint">{t('rewards.badgesTap')}</Text>
          </View>
          <Row wrap style={{ justifyContent: 'space-between', rowGap: spacing.xl }}>
            {BADGES.map((b) => {
              const has = earned.has(b.id);
              return (
                <Pressable key={b.id} accessibilityRole="button" onPress={() => setDetail(b.id)} style={{ width: '31%' }}>
                  <View style={{ alignItems: 'center', gap: spacing.sm }}>
                    <HexBadge id={b.id} icon={b.icon} colors={b.colors} earned={has} />
                    <Text variant="caption" tone={has ? 'secondary' : 'faint'} center>{t(`rewards.badge_${b.id}`)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </Row>
          {detail ? (
            <Card tone="alt" style={{ gap: 4 }}>
              <Row gap={spacing.sm}>
                <HexBadge
                  id={`d-${detail}`}
                  icon={BADGES.find((b) => b.id === detail)!.icon}
                  colors={BADGES.find((b) => b.id === detail)!.colors}
                  earned={earned.has(detail)}
                  size={44}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="label">{t(`rewards.badge_${detail}`)}</Text>
                  <Text variant="caption" tone="secondary">{t(`rewards.badgeDesc_${detail}`)}</Text>
                  <Text variant="caption" tone={earned.has(detail) ? 'accent' : 'faint'}>
                    {earned.has(detail) ? t('rewards.badgeOwned') : t('rewards.badgeLocked')}
                  </Text>
                </View>
              </Row>
            </Card>
          ) : null}
        </View>
      ) : null}

      {tab === 'streak' ? (
        <View style={{ gap: spacing.lg }}>
          <HeroBanner title={t('rewards.tab_streak')} subtitle={t('rewards.streakHero')} icon="flame" />
          <Card style={{ alignItems: 'center', gap: spacing.md }}>
            <Text variant="display">🔥 {streak}</Text>
            <Text variant="caption" tone="secondary">{t('rewards.streakDays', { count: streak })}</Text>
            <Row gap={spacing.sm}>
              {week.map((d) => {
                const checked = checkedDates.has(d.iso);
                const isToday = d.iso === todayISO;
                return (
                  <View key={d.iso} style={{ alignItems: 'center', gap: 4 }}>
                    <View
                      style={{
                        width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: checked ? colors.accentSoft : colors.surfaceAlt,
                        borderWidth: isToday ? 2 : 1,
                        borderColor: isToday ? colors.accent : colors.border,
                      }}
                    >
                      <Ionicons name={checked ? 'flame' : 'flame-outline'} size={16} color={checked ? colors.accent : colors.inkFaint} />
                    </View>
                    <Text variant="caption" tone="faint">{d.label}</Text>
                  </View>
                );
              })}
            </Row>
            <Chip
              label={checkedToday ? t('rewards.checkedIn') : t('rewards.checkIn')}
              selected={!checkedToday}
              onPress={() => {
                if (checkIn()) toast(t('rewards.checkInOk'));
                else toast(t('rewards.checkedIn'));
              }}
            />
          </Card>
          <Text variant="caption" tone="faint" center>{t('rewards.streakNote')}</Text>
        </View>
      ) : null}

      <View style={{ height: spacing.xxxl }} />
    </Screen>
  );
}

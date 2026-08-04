import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
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

const BADGES: { id: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { id: 'explorer', icon: 'compass', color: '#0C6EAA' },
  { id: 'aspirant', icon: 'create', color: '#7C3AED' },
  { id: 'prepper', icon: 'folder-open', color: '#0B7A47' },
  { id: 'applicant', icon: 'paper-plane', color: '#2447DB' },
  { id: 'offer', icon: 'ribbon', color: '#B45309' },
  { id: 'grad', icon: 'school', color: '#9D174D' },
];

export default function RewardsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('coins');
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

  // Badges are earned from real journey state, not flags.
  const earned = new Set<string>();
  if (profile) earned.add('explorer');
  if (profile && (profile.grades.subjects?.length || profile.grades.total !== undefined)) earned.add('aspirant');
  if (documents.length >= 4) earned.add('prepper');
  if (applications.length > 0) earned.add('applicant');
  if (applications.some((a) => ['conditional_offer', 'offer', 'accepted', 'coe_issued'].includes(a.status))) earned.add('offer');
  if (applications.some((a) => ['accepted', 'coe_issued'].includes(a.status))) earned.add('grad');

  const [detail, setDetail] = useState<string | null>(null);
  const checkedToday = lastCheckIn === new Date().toISOString().slice(0, 10);

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <Row style={{ paddingVertical: spacing.md, gap: spacing.md }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text variant="title">{t('rewards.title')}</Text>
      </Row>

      <Row gap={spacing.sm} style={{ marginBottom: spacing.lg }}>
        {(['coins', 'badges', 'streak'] as const).map((k) => (
          <Chip key={k} label={t(`rewards.tab_${k}`)} selected={tab === k} onPress={() => setTab(k)} />
        ))}
      </Row>

      {tab === 'coins' ? (
        <View style={{ gap: spacing.lg }}>
          <Card tone="accent" style={{ gap: 4 }}>
            <Text variant="caption" color={colors.onAccent} style={{ opacity: 0.85 }}>{t('rewards.balance')}</Text>
            <Row gap={spacing.sm}>
              <Ionicons name="server" size={22} color={colors.onAccent} />
              <Text variant="display" color={colors.onAccent}>{coins}</Text>
            </Row>
            <Text variant="caption" color={colors.onAccent} style={{ opacity: 0.85 }}>{t('rewards.earnHint')}</Text>
          </Card>

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
              {history.slice(0, 12).map((h) => (
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
          <Text variant="caption" tone="secondary">
            {t('rewards.badgesEarned', { count: earned.size })}
          </Text>
          <Row wrap gap={spacing.md}>
            {BADGES.map((b) => {
              const has = earned.has(b.id);
              return (
                <Pressable key={b.id} accessibilityRole="button" onPress={() => setDetail(b.id)} style={{ width: '30%' }}>
                  <View style={{ alignItems: 'center', gap: spacing.sm }}>
                    <View
                      style={{
                        width: 74, height: 74, borderRadius: 24, transform: [{ rotate: '45deg' }],
                        backgroundColor: has ? b.color : colors.surfaceAlt,
                        borderWidth: has ? 0 : 1, borderColor: colors.border,
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <View style={{ transform: [{ rotate: '-45deg' }] }}>
                        <Ionicons name={has ? b.icon : 'lock-closed'} size={26} color={has ? '#FFFFFF' : colors.inkFaint} />
                      </View>
                    </View>
                    <Text variant="caption" tone={has ? 'secondary' : 'faint'} center>{t(`rewards.badge_${b.id}`)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </Row>
          {detail ? (
            <Card tone="alt" style={{ gap: 4 }}>
              <Text variant="label">{t(`rewards.badge_${detail}`)}</Text>
              <Text variant="caption" tone="secondary">{t(`rewards.badgeDesc_${detail}`)}</Text>
              <Text variant="caption" tone={earned.has(detail) ? 'accent' : 'faint'}>
                {earned.has(detail) ? t('rewards.badgeOwned') : t('rewards.badgeLocked')}
              </Text>
            </Card>
          ) : null}
        </View>
      ) : null}

      {tab === 'streak' ? (
        <View style={{ gap: spacing.lg }}>
          <Card style={{ alignItems: 'center', gap: spacing.sm }}>
            <Text variant="display">🔥 {streak}</Text>
            <Text variant="caption" tone="secondary">{t('rewards.streakDays', { count: streak })}</Text>
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

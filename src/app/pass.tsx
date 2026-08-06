import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { goBack } from '@/services/nav';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  SEASON_PASS_LIFETIME_USD, SEASON_PASS_MONTHLY_USD, VIP_BUNDLE_PRICE_USD,
  type PassTerm, usePlan, usePlanStore,
} from '@/store/usePlanStore';
import { toast } from '@/store/useToastStore';
import { useState } from 'react';

// Light, optimistic — cobalt → emerald, deliberately distinct from the
// dark-gold VIP arrival bundle so the two offers never blur together.
const HERO: [string, string] = ['#2447DB', '#0B7A47'];
const GOLD = '#B8923B';
const COL = 52;

const APPLY_ROWS = ['match', 'compare', 'apps', 'timeline', 'review', 'team', 'mail', 'predep', 'life', 'rewards', 'community', 'safety'] as const;
const ARRIVAL_ROWS = ['fastTrack', 'scholar', 'helpline', 'sim', 'bank', 'pickup', 'events'] as const;
const FREE_ROWS = new Set(['match', 'community', 'safety']);

export default function SeasonPassScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const plan = usePlan();
  const purchase = usePlanStore((s) => s.purchase);
  const passTerm = usePlanStore((s) => s.passTerm);
  const [term, setTerm] = useState<PassTerm>('lifetime');

  const mark = (on: boolean, color: string) => (
    <View style={{ width: COL, alignItems: 'center' }}>
      <Ionicons
        name={on ? 'checkmark-circle' : 'remove-circle-outline'}
        size={18}
        color={on ? color : colors.inkFaint}
      />
    </View>
  );

  const tierRow = (r: string, freeOn: boolean, passOn: boolean) => (
    <Row key={r} gap={spacing.sm} style={{ paddingVertical: 2 }}>
      <Text variant="caption" tone="secondary" style={{ flex: 1 }}>{t(`pass.row_${r}`)}</Text>
      {mark(freeOn, colors.eligible)}
      {mark(passOn, colors.eligible)}
      {mark(true, GOLD)}
    </Row>
  );

  return (
    <Screen scroll edges={['top', 'bottom']} padded={false}>
      <View style={{ paddingBottom: spacing.xxxl }}>
        <LinearGradient colors={HERO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: spacing.xl, paddingBottom: spacing.xxl }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => goBack('/profile')} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </Pressable>
          <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
            <Row gap={spacing.sm}>
              <Ionicons name="key" size={22} color="#9BE7C4" />
              <Text variant="label" color="#9BE7C4">{t('pass.title')}</Text>
            </Row>
            <Text variant="display" color="#FFFFFF">{t('pass.headline')}</Text>
            <Text variant="body" color="rgba(255,255,255,0.85)">{t('pass.sub')}</Text>
          </View>
        </LinearGradient>

        <View style={{ padding: spacing.lg, gap: spacing.lg, marginTop: -spacing.lg }}>
          <Card style={{ gap: spacing.sm }}>
            <Row gap={spacing.sm}>
              <View style={{ flex: 1 }} />
              <View style={{ width: COL, alignItems: 'center' }}>
                <Text variant="caption" tone="faint">{t('pass.colFree')}</Text>
                <Text variant="caption" tone="faint">US$0</Text>
              </View>
              <View style={{ width: COL, alignItems: 'center' }}>
                <Text variant="caption" tone="accent">{t('pass.colPass')}</Text>
                <Text variant="caption" tone="accent">US${SEASON_PASS_MONTHLY_USD}+</Text>
              </View>
              <View style={{ width: COL, alignItems: 'center' }}>
                <Text variant="caption" color={GOLD}>{t('pass.colVip')}</Text>
                <Text variant="caption" color={GOLD}>US${VIP_BUNDLE_PRICE_USD}</Text>
              </View>
            </Row>

            <Text variant="label" tone="secondary">{t('pass.groupApply')}</Text>
            {APPLY_ROWS.map((r) => tierRow(r, FREE_ROWS.has(r), true))}

            <Text variant="label" tone="secondary" style={{ marginTop: spacing.sm }}>{t('pass.groupArrival')}</Text>
            {ARRIVAL_ROWS.map((r) => tierRow(r, false, false))}
          </Card>

          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text variant="display" tone="accent">US${SEASON_PASS_MONTHLY_USD}–{SEASON_PASS_LIFETIME_USD}</Text>
            <Text variant="caption" tone="faint">{t('pass.chooseTerm')}</Text>
          </View>

          {plan !== 'free' ? (
            <View style={{ alignItems: 'center', gap: spacing.sm }}>
              <Badge tone="eligible" icon="checkmark-circle" label={plan === 'vip' ? t('vip.owned') : t('pass.owned')} />
              {plan === 'season_pass' && passTerm ? (
                <Text variant="caption" tone="secondary">{t(`pass.termActive_${passTerm}`)}</Text>
              ) : null}
            </View>
          ) : (
            <>
              <Row gap={spacing.md}>
                {(['monthly', 'lifetime'] as const).map((k) => {
                  const on = term === k;
                  const price = k === 'monthly' ? SEASON_PASS_MONTHLY_USD : SEASON_PASS_LIFETIME_USD;
                  return (
                    <Pressable
                      key={k}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      onPress={() => setTerm(k)}
                      style={{
                        flex: 1, borderRadius: 14, borderWidth: 2,
                        borderColor: on ? colors.accent : colors.border,
                        backgroundColor: on ? colors.accentSoft : colors.surface,
                        padding: spacing.lg, gap: 2, alignItems: 'center',
                      }}
                    >
                      {k === 'lifetime' ? <Badge tone="eligible" label={t('pass.bestValue')} /> : null}
                      <Text variant="title" tone={on ? 'accent' : 'primary'}>US${price}</Text>
                      <Text variant="caption" tone="secondary" center>{t(`pass.term_${k}`)}</Text>
                    </Pressable>
                  );
                })}
              </Row>
              <Button
                label={t('pass.cta')}
                size="lg"
                onPress={() => {
                  purchase(term);
                  toast(t('pass.purchased'));
                }}
              />
            </>
          )}
          <Text variant="caption" tone="faint" center>{t('pass.mockNote')}</Text>

          <Card onPress={() => router.push('/vip')} style={{ gap: 4, borderColor: '#D9B45B', borderWidth: 1 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={spacing.sm} style={{ flex: 1 }}>
                <Ionicons name="diamond" size={18} color={GOLD} />
                <View style={{ flex: 1 }}>
                  <Text variant="label">{t('vip.title')} · US${VIP_BUNDLE_PRICE_USD}</Text>
                  <Text variant="caption" tone="faint">{t('pass.vipMore')}</Text>
                </View>
              </Row>
              <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
            </Row>
          </Card>

          <Card tone="alt" style={{ gap: 4 }}>
            <Row gap={spacing.sm}>
              <Ionicons name="hand-left-outline" size={18} color={colors.accent} />
              <Text variant="label">{t('pass.conciergeTitle')}</Text>
              <Badge tone="neutral" label={t('common.comingSoon')} />
            </Row>
            <Text variant="caption" tone="secondary">{t('pass.conciergeBody')}</Text>
          </Card>
        </View>
      </View>
    </Screen>
  );
}

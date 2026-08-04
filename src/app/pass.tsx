import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
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
import { SEASON_PASS_PRICE_USD, usePlan, usePlanStore } from '@/store/usePlanStore';
import { toast } from '@/store/useToastStore';

// Light, optimistic — cobalt → emerald, deliberately distinct from the
// dark-gold VIP arrival bundle so the two offers never blur together.
const HERO: [string, string] = ['#2447DB', '#0B7A47'];

const ROWS = ['match', 'compare', 'apps', 'timeline', 'review', 'team', 'mail', 'predep', 'community'] as const;
const FREE_ROWS = new Set(['match', 'community']);

export default function SeasonPassScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const plan = usePlan();
  const purchase = usePlanStore((s) => s.purchase);

  return (
    <Screen scroll edges={['top', 'bottom']} padded={false}>
      <View style={{ paddingBottom: spacing.xxxl }}>
        <LinearGradient colors={HERO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: spacing.xl, paddingBottom: spacing.xxl }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} hitSlop={10}>
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
            <Row gap={spacing.md}>
              <View style={{ flex: 1 }} />
              <Text variant="caption" tone="faint" style={{ width: 56, textAlign: 'center' }}>{t('pass.colFree')}</Text>
              <Text variant="caption" tone="accent" style={{ width: 56, textAlign: 'center' }}>{t('pass.colPass')}</Text>
            </Row>
            {ROWS.map((r) => (
              <Row key={r} gap={spacing.md} style={{ paddingVertical: 2 }}>
                <Text variant="caption" tone="secondary" style={{ flex: 1 }}>{t(`pass.row_${r}`)}</Text>
                <View style={{ width: 56, alignItems: 'center' }}>
                  <Ionicons
                    name={FREE_ROWS.has(r) ? 'checkmark-circle' : 'remove-circle-outline'}
                    size={18}
                    color={FREE_ROWS.has(r) ? colors.eligible : colors.inkFaint}
                  />
                </View>
                <View style={{ width: 56, alignItems: 'center' }}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.eligible} />
                </View>
              </Row>
            ))}
          </Card>

          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text variant="display" tone="accent">US${SEASON_PASS_PRICE_USD}</Text>
            <Text variant="caption" tone="faint">{t('pass.oneTime')}</Text>
          </View>

          {plan === 'season_pass' ? (
            <Badge tone="eligible" icon="checkmark-circle" label={t('pass.owned')} />
          ) : (
            <Button
              label={t('pass.cta')}
              size="lg"
              onPress={() => {
                purchase();
                toast(t('pass.purchased'));
              }}
            />
          )}
          <Text variant="caption" tone="faint" center>{t('pass.mockNote')}</Text>

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

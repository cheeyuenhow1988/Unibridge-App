import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { goBack } from '@/services/nav';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { VIP_BUNDLE_PRICE_USD, usePlan, usePlanStore } from '@/store/usePlanStore';
import { toast } from '@/store/useToastStore';
const GOLD = '#D9B45B';
const GOLD_SOFT = 'rgba(217, 180, 91, 0.16)';
const INK_DARK = '#0B0E14';
const CARD_DARK = '#141924';
const TEXT_SOFT = 'rgba(255,255,255,0.72)';

const BENEFITS = [
  'fastTrack', 'priority', 'scholarships', 'helpline', 'sim', 'bank', 'pickup', 'events',
] as const;

export default function VipScreen() {
  const { t } = useTranslation();
  const plan = usePlan();
  const purchaseVip = usePlanStore((s) => s.purchaseVip);
  return (
    <View style={{ flex: 1, backgroundColor: INK_DARK }}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => goBack('/profile')} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </Pressable>

          <View style={{ alignItems: 'center', gap: spacing.md }}>
            <View
              style={{
                width: 64, height: 64, borderRadius: radius.full, backgroundColor: GOLD_SOFT,
                alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: GOLD,
              }}
            >
              <Ionicons name="diamond" size={28} color={GOLD} />
            </View>
            <Text variant="display" color="#FFFFFF" center>{t('vip.title')}</Text>
            <Text variant="body" color={TEXT_SOFT} center style={{ maxWidth: 300 }}>
              {t('vip.subtitle')}
            </Text>
          </View>

          <View style={{ backgroundColor: CARD_DARK, borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(217,180,91,0.35)', padding: spacing.xl, gap: spacing.lg }}>
            {BENEFITS.map((b) => (
              <View key={b} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
                <Ionicons name="checkmark-circle" size={20} color={GOLD} />
                <Text variant="body" color="#FFFFFF" style={{ flex: 1 }}>{t(`vip.benefit_${b}`)}</Text>
              </View>
            ))}
            <Text variant="caption" color={TEXT_SOFT} center>{t('vip.more')}</Text>
          </View>

          <View style={{ alignItems: 'center', gap: spacing.sm }}>
            <Text variant="caption" color={TEXT_SOFT}>{t('vip.oneTime')}</Text>
            <Text variant="display" color={GOLD}>US${VIP_BUNDLE_PRICE_USD}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="key" size={14} color={GOLD} />
              <Text variant="caption" color={TEXT_SOFT}>{t('vip.includesPass')}</Text>
            </View>
          </View>

          {plan === 'vip' ? (
            <View
              style={{
                borderRadius: radius.full, borderWidth: 1, borderColor: GOLD, backgroundColor: GOLD_SOFT,
                paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
              }}
            >
              <Ionicons name="checkmark-circle" size={18} color={GOLD} />
              <Text variant="label" color={GOLD}>{t('vip.owned')}</Text>
            </View>
          ) : (
            <LinearGradient
              colors={[GOLD, '#B8923B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: radius.full }}
            >
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  purchaseVip();
                  toast(t('vip.purchased'));
                }}
                style={({ pressed }) => ({ paddingVertical: 16, alignItems: 'center', opacity: pressed ? 0.85 : 1 })}
              >
                <Text variant="label" color={INK_DARK}>{t('vip.cta')}</Text>
              </Pressable>
            </LinearGradient>
          )}
          <Text variant="caption" color={TEXT_SOFT} center>{t('vip.mockNote')}</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

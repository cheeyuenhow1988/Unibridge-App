import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Row } from '@/components/ui/Misc';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { SEASON_PASS_LIFETIME_USD, SEASON_PASS_MONTHLY_USD } from '@/store/usePlanStore';

export type UpgradeContext = 'apply' | 'compare' | 'team' | 'mail' | 'timeline' | 'predep' | 'life' | 'generic';

const COMPARISON: { id: string; free: boolean }[] = [
  { id: 'match', free: true },
  { id: 'compare', free: false },
  { id: 'apps', free: false },
  { id: 'timeline', free: false },
  { id: 'review', free: false },
  { id: 'team', free: false },
  { id: 'mail', free: false },
  { id: 'predep', free: false },
  { id: 'life', free: false },
  { id: 'rewards', free: false },
  { id: 'community', free: true },
  { id: 'safety', free: true },
];

interface Props {
  visible: boolean;
  context: UpgradeContext;
  onClose: () => void;
}

/** Helpful, no-pressure upgrade sheet — context first, comparison, one CTA. */
export function UpgradeSheet({ visible, context, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose} />
      <SafeAreaView
        edges={['bottom']}
        style={{
          backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '88%',
        }}
      >
        <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={spacing.sm}>
              <Ionicons name="key" size={20} color={colors.accent} />
              <Text variant="title">{t('pass.title')}</Text>
            </Row>
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.inkSecondary} />
            </Pressable>
          </Row>

          <View style={{ backgroundColor: colors.accentSoft, borderRadius: radius.lg, padding: spacing.lg }}>
            <Text variant="body" tone="accent">{t(`pass.ctx_${context}`)}</Text>
          </View>

          <View style={{ gap: spacing.sm }}>
            {COMPARISON.map((row) => (
              <Row key={row.id} gap={spacing.md}>
                <Text variant="caption" tone="secondary" style={{ flex: 1 }}>{t(`pass.row_${row.id}`)}</Text>
                <View style={{ width: 52, alignItems: 'center' }}>
                  <Ionicons
                    name={row.free ? 'checkmark-circle' : 'remove-circle-outline'}
                    size={18}
                    color={row.free ? colors.eligible : colors.inkFaint}
                  />
                </View>
                <View style={{ width: 52, alignItems: 'center' }}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.eligible} />
                </View>
              </Row>
            ))}
            <Row gap={spacing.md}>
              <View style={{ flex: 1 }} />
              <Text variant="caption" tone="faint" style={{ width: 52, textAlign: 'center' }}>{t('pass.colFree')}</Text>
              <Text variant="caption" tone="accent" style={{ width: 52, textAlign: 'center' }}>{t('pass.colPass')}</Text>
            </Row>
          </View>

          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text variant="display" tone="accent">US${SEASON_PASS_MONTHLY_USD}–{SEASON_PASS_LIFETIME_USD}</Text>
            <Text variant="caption" tone="faint">{t('pass.chooseTerm')}</Text>
          </View>

          <Button
            label={t('pass.sheetCta', { price: `US$${SEASON_PASS_MONTHLY_USD}` })}
            size="lg"
            onPress={() => {
              onClose();
              router.push('/pass');
            }}
          />
          <Pressable accessibilityRole="button" onPress={() => { onClose(); router.push('/pass'); }}>
            <Text variant="caption" tone="accent" center>{t('pass.learnMore')}</Text>
          </Pressable>
          <Text variant="caption" tone="faint" center>{t('pass.mockNote')}</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

/** Small lock chip used on gated elements. */
export function LockChip({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
        backgroundColor: colors.accentSoft, borderRadius: radius.full,
        paddingHorizontal: spacing.md, paddingVertical: 4,
      }}
    >
      <Ionicons name="lock-closed" size={12} color={colors.accent} />
      <Text variant="caption" tone="accent">{t('pass.chip')}</Text>
    </Pressable>
  );
}

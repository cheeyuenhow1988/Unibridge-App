import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { Row } from '@/components/ui/Misc';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useTheme } from '@/hooks/useTheme';
import { listAmbassadors } from '@/services/api';
import { toast } from '@/store/useToastStore';
import type { CostOfLiving } from '@/types/models';

/**
 * Community-verified badge for cost figures: "Verified by N students living
 * here" with the confirming ambassadors, or a plain "Estimated" label —
 * never neither, never faked.
 */
export function VerifiedCostBadge({ col }: { col: CostOfLiving }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [voted, setVoted] = useState<'up' | 'down' | null>(null);
  const ambassadors = useAsync(() => listAmbassadors(), []);

  const verifiers = col.verifiedBy ?? [];
  const verified = verifiers.length > 0;
  const names = (ambassadors.data ?? [])
    .filter((a) => verifiers.includes(a.id))
    .map((a) => a.name);

  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)} hitSlop={6} style={{ alignSelf: 'flex-start' }}>
        {verified ? (
          <Badge tone="eligible" icon="shield-checkmark" label={t('costVerified.verified', { count: verifiers.length })} />
        ) : (
          <Badge tone="neutral" icon="calculator-outline" label={t('costVerified.estimated')} />
        )}
      </Pressable>

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.xl }} onPress={() => setOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{ backgroundColor: colors.bg, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text variant="title">{t('costVerified.title')}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => setOpen(false)} hitSlop={10}>
                  <Ionicons name="close" size={20} color={colors.inkSecondary} />
                </Pressable>
              </Row>

              {verified ? (
                <View style={{ gap: spacing.sm }}>
                  <Text variant="caption" tone="secondary">{t('costVerified.verifiedBy')} · {col.city}</Text>
                  {names.map((n) => (
                    <Row key={n} gap={spacing.sm}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.eligible} />
                      <Text variant="body">{n}</Text>
                    </Row>
                  ))}
                  {col.lastVerified ? (
                    <Text variant="caption" tone="faint">{t('costVerified.lastVerified', { date: col.lastVerified })}</Text>
                  ) : null}
                </View>
              ) : (
                <Text variant="body" tone="secondary">{t('costVerified.estimatedBody')}</Text>
              )}

              <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm }}>
                <Text variant="caption" tone="secondary">{t('costVerified.askTitle')}</Text>
                <Row gap={spacing.sm}>
                  <Chip
                    small
                    label={t('costVerified.confirm')}
                    selected={voted === 'up'}
                    onPress={() => { setVoted('up'); toast(t('costVerified.confirmed')); }}
                  />
                  <Chip
                    small
                    label={t('costVerified.flag')}
                    selected={voted === 'down'}
                    onPress={() => { setVoted('down'); toast(t('costVerified.flagged')); }}
                  />
                </Row>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

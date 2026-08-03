import { Modal, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatMoney } from '@/services/currency';
import type { Course, Institution } from '@/types/models';

interface Props {
  visible: boolean;
  course: Course | null;
  institution: Institution | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function DepositModal({ visible, course, institution, onConfirm, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (!course || !institution) return null;
  const deposit = course.oneOffFees.enrollment;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.xl }} onPress={onClose}>
        <Pressable onPress={() => undefined}>
          <View style={{ backgroundColor: colors.bg, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.lg }}>
            <Text variant="title">{t('applications.depositTitle')}</Text>
            <Text variant="body" tone="secondary">
              {t('applications.depositBody', {
                amount: formatMoney(deposit, course.currency),
                institution: institution.name,
              })}
            </Text>
            <Button label={t('applications.payDeposit')} size="lg" icon="lock-closed-outline" onPress={onConfirm} />
            <Button label={t('common.cancel')} variant="ghost" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

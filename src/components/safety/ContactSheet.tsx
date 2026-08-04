import { Ionicons } from '@expo/vector-icons';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SAFETY_TEAL } from '@/components/safety/EmergencySheet';
import { Button } from '@/components/ui/Button';
import { Row } from '@/components/ui/Misc';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useProfileStore } from '@/store/useProfileStore';
import { toast } from '@/store/useToastStore';
import type { EmergencyContact } from '@/types/models';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Called after the contact is saved — e.g. to retry a blocked submission. */
  onSaved?: () => void;
}

/** Bottom-sheet form collecting the required emergency contact. */
export function ContactSheet({ visible, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const patchProfile = useProfileStore((s) => s.patchProfile);

  const { control, handleSubmit } = useForm<EmergencyContact>({
    defaultValues: { name: '', relationship: '', phone: '', email: '' },
  });

  const save = handleSubmit((values) => {
    patchProfile({ emergencyContact: values });
    toast(t('safety.contactSaved'));
    onClose();
    onSaved?.();
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose} />
      <SafeAreaView
        edges={['bottom']}
        style={{ backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '88%' }}
      >
        <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.md }} keyboardShouldPersistTaps="handled">
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={spacing.sm}>
              <Ionicons name="shield-checkmark" size={20} color={SAFETY_TEAL} />
              <Text variant="title">{t('safety.contactTitle')}</Text>
            </Row>
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.inkSecondary} />
            </Pressable>
          </Row>
          <View style={{ backgroundColor: 'rgba(14, 116, 144, 0.12)', borderRadius: radius.lg, padding: spacing.lg }}>
            <Text variant="body" color={SAFETY_TEAL}>{t('safety.contactRequired')}</Text>
          </View>
          <Controller
            control={control}
            name="name"
            rules={{ required: t('onboarding.nameRequired') }}
            render={({ field, fieldState }) => (
              <TextField label={t('safety.contactName')} value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} autoCapitalize="words" />
            )}
          />
          <Controller
            control={control}
            name="relationship"
            render={({ field }) => (
              <TextField label={t('safety.contactRelationship')} placeholder={t('safety.relationshipPlaceholder')} value={field.value} onChangeText={field.onChange} />
            )}
          />
          <Controller
            control={control}
            name="phone"
            rules={{ required: t('safety.phoneRequired') }}
            render={({ field, fieldState }) => (
              <TextField label={t('safety.contactPhone')} value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} keyboardType="phone-pad" />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <TextField label={t('safety.contactEmail')} value={field.value} onChangeText={field.onChange} keyboardType="email-address" autoCapitalize="none" />
            )}
          />
          <Button label={t('safety.contactSave')} size="lg" icon="save-outline" onPress={save} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

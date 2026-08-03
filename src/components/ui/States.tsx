import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';

interface EmptyProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({ icon = 'telescope-outline', title, body, ctaLabel, onCta }: EmptyProps) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl, gap: spacing.md }}>
      <View
        style={{
          width: 72, height: 72, borderRadius: radius.full, backgroundColor: colors.surfaceAlt,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={30} color={colors.inkFaint} />
      </View>
      <Text variant="sub" center>{title}</Text>
      {body ? <Text variant="body" tone="secondary" center>{body}</Text> : null}
      {ctaLabel && onCta ? <Button label={ctaLabel} onPress={onCta} variant="secondary" size="sm" /> : null}
    </View>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl, gap: spacing.md }}>
      <View
        style={{
          width: 72, height: 72, borderRadius: radius.full, backgroundColor: colors.dangerSoft,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Ionicons name="cloud-offline-outline" size={30} color={colors.danger} />
      </View>
      <Text variant="sub" center>{t('common.errorTitle')}</Text>
      <Text variant="body" tone="secondary" center>{t('common.errorBody')}</Text>
      <Button label={t('common.retry')} onPress={onRetry} variant="secondary" size="sm" />
    </View>
  );
}

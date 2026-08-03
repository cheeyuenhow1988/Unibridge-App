import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '@/components/ui/Text';

export type BadgeTone = 'eligible' | 'borderline' | 'pathway' | 'verified' | 'danger' | 'neutral' | 'accent';

interface Props {
  label: string;
  tone?: BadgeTone;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Badge({ label, tone = 'neutral', icon }: Props) {
  const { colors } = useTheme();
  const map = {
    eligible: [colors.eligibleSoft, colors.eligible],
    borderline: [colors.borderlineSoft, colors.borderline],
    pathway: [colors.pathwaySoft, colors.pathway],
    verified: [colors.verifiedSoft, colors.verified],
    danger: [colors.dangerSoft, colors.danger],
    accent: [colors.accentSoft, colors.accent],
    neutral: [colors.surfaceAlt, colors.inkSecondary],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: bg,
        borderRadius: radius.full,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 4,
        alignSelf: 'flex-start',
      }}
    >
      {icon ? <Ionicons name={icon} size={11} color={fg} /> : null}
      <Text variant="micro" color={fg} numberOfLines={1}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

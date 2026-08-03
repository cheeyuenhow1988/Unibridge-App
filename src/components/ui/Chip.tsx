import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { fonts, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '@/components/ui/Text';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}

export function Chip({ label, selected, onPress, style, small }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: small ? 32 : 40,
          paddingHorizontal: small ? spacing.md : spacing.lg,
          borderRadius: radius.full,
          backgroundColor: selected ? colors.accent : colors.surface,
          borderWidth: 1,
          borderColor: selected ? colors.accent : colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text
        variant="caption"
        color={selected ? colors.onAccent : colors.inkSecondary}
        style={{ fontFamily: selected ? fonts.bold : fonts.semibold, fontSize: small ? 12 : 13 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

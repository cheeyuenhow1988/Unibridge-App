import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { fonts, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '@/components/ui/Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'pop';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'md' | 'lg' | 'sm';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, variant = 'primary', size = 'md', icon, disabled, loading, style }: Props) {
  const { colors } = useTheme();
  const bg =
    variant === 'primary' ? colors.accent
    : variant === 'pop' ? colors.pop
    : variant === 'danger' ? colors.danger
    : variant === 'secondary' ? colors.surface
    : 'transparent';
  const fg =
    variant === 'pop' ? colors.onPop
    : variant === 'primary' || variant === 'danger' ? colors.onAccent
    : colors.accent;
  const height = size === 'lg' ? 54 : size === 'sm' ? 40 : 48;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          height,
          minWidth: 44,
          borderRadius: radius.full,
          backgroundColor: bg,
          borderWidth: variant === 'secondary' ? 1.5 : 0,
          borderColor: colors.accent,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          paddingHorizontal: size === 'sm' ? spacing.lg : spacing.xxl,
          opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 19} color={fg} /> : null}
          <Text
            variant="label"
            color={fg}
            style={{ fontFamily: fonts.bold, fontSize: size === 'lg' ? 16 : size === 'sm' ? 13.5 : 15 }}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

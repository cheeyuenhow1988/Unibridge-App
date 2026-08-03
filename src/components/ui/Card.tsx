import type { PropsWithChildren } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface Props extends PropsWithChildren {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  tone?: 'surface' | 'alt' | 'accent';
}

export function Card({ children, onPress, style, padded = true, tone = 'surface' }: Props) {
  const { colors, scheme } = useTheme();
  const base: ViewStyle = {
    backgroundColor: tone === 'accent' ? colors.accentSoft : tone === 'alt' ? colors.surfaceAlt : colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...(padded ? { padding: spacing.lg } : { overflow: 'hidden' as const }),
    ...(scheme === 'light'
      ? { shadowColor: '#172723', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }
      : null),
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [base, pressed && { opacity: 0.85, transform: [{ scale: 0.995 }] }, style]}
    >
      {children}
    </Pressable>
  );
}

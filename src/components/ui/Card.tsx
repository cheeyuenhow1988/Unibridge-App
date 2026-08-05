import type { PropsWithChildren } from 'react';
import { Pressable, View, type PressableStateCallbackType, type StyleProp, type ViewStyle } from 'react-native';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface Props extends PropsWithChildren {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  tone?: 'surface' | 'alt' | 'accent';
}

/** RN types omit the web-only hover/focus interaction states. */
type WebPressableState = PressableStateCallbackType & { hovered?: boolean; focused?: boolean };

export function Card({ children, onPress, style, padded = true, tone = 'surface' }: Props) {
  const { colors, scheme } = useTheme();
  const base: ViewStyle = {
    backgroundColor: tone === 'accent' ? colors.accentSoft : tone === 'alt' ? colors.surfaceAlt : colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...(padded ? { padding: spacing.lg } : { overflow: 'hidden' as const }),
    ...(scheme === 'light'
      ? { shadowColor: '#1B2A5B', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 3 }
      : null),
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={(state: WebPressableState) => [
        base,
        (state.hovered || state.focused) && { borderColor: colors.accent, transform: [{ translateY: -1 }] },
        state.pressed && { opacity: 0.85, transform: [{ scale: 0.995 }] },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

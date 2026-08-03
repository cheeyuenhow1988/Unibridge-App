import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';
import { radius, spacing, typeScale } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useToastStore } from '@/store/useToastStore';

/** Global transient confirmation pill, rendered once in the root layout. */
export function ToastHost() {
  const { colors } = useTheme();
  const message = useToastStore((s) => s.message);
  const nonce = useToastStore((s) => s.nonce);
  const clear = useToastStore((s) => s.clear);
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!message) return;
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => clear());
    }, 2200);
    return () => clearTimeout(timer);
  }, [message, nonce, opacity, clear]);

  if (!message) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 96, alignItems: 'center' }}>
      <Animated.View
        style={{
          opacity,
          backgroundColor: colors.ink,
          borderRadius: radius.full,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md,
          maxWidth: '85%',
        }}
      >
        <Animated.Text style={[typeScale.label, { color: colors.bg, textAlign: 'center' }]}>{message}</Animated.Text>
      </Animated.View>
    </View>
  );
}

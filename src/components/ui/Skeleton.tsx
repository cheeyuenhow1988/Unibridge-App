import { useEffect, useRef } from 'react';
import { Animated, View, type StyleProp, type ViewStyle } from 'react-native';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  width?: number | `${number}%`;
  height?: number;
  round?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = '100%', height = 16, round, style }: Props) {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: round ? radius.full : radius.sm,
          backgroundColor: colors.skeleton,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

/** Standard placeholder while a card list loads. */
export function SkeletonCards({ count = 3, height = 120 }: { count?: number; height?: number }) {
  return (
    <View style={{ gap: spacing.md, paddingVertical: spacing.md }}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={height} style={{ borderRadius: radius.lg }} />
      ))}
    </View>
  );
}

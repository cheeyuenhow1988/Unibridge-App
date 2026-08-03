import type { PropsWithChildren, ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '@/components/ui/Text';

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ height: 1, backgroundColor: colors.border }, style]} />;
}

export function Row({
  children, gap = spacing.sm, style, wrap, center,
}: PropsWithChildren<{ gap?: number; style?: StyleProp<ViewStyle>; wrap?: boolean; center?: boolean }>) {
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', gap },
        wrap && { flexWrap: 'wrap' },
        center && { justifyContent: 'center' },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.md }}>
      <Text variant="heading">{title}</Text>
      {right}
    </Row>
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ height: 8, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
      <View
        style={{
          width: `${Math.min(100, Math.max(0, value * 100))}%`,
          height: '100%',
          borderRadius: radius.full,
          backgroundColor: color ?? colors.accent,
        }}
      />
    </View>
  );
}

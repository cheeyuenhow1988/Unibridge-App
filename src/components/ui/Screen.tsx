import type { PropsWithChildren } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edges } from 'react-native-safe-area-context';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface Props extends PropsWithChildren {
  scroll?: boolean;
  padded?: boolean;
  edges?: Edges;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({ children, scroll, padded = true, edges = ['top'], style, contentStyle }: Props) {
  const { colors } = useTheme();
  const pad = padded ? { paddingHorizontal: spacing.lg } : null;
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: colors.bg }, style]}>
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[pad, { paddingBottom: spacing.xxxl }, contentStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, pad, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { useRef, useState, type PropsWithChildren } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

/**
 * Horizontal scroller with explicit next/previous arrows on web, where a
 * peeking card alone is a weak affordance and wheel-scrolling sideways is
 * awkward. On touch platforms the arrows stay hidden — swiping is natural.
 */
export function HCarousel({ children, step = 300 }: PropsWithChildren<{ step?: number }>) {
  const { colors } = useTheme();
  const ref = useRef<ScrollView>(null);
  const x = useRef(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const isWeb = Platform.OS === 'web';

  const arrow = (dir: 1 | -1) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={dir === 1 ? '→' : '←'}
      onPress={() => ref.current?.scrollTo({ x: Math.max(0, x.current + dir * step), animated: true })}
      style={({ pressed }) => ({
        position: 'absolute',
        [dir === 1 ? 'right' : 'left']: -4,
        top: '38%',
        width: 36,
        height: 36,
        borderRadius: radius.full,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.8 : 0.95,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        zIndex: 2,
        elevation: 3,
      })}
    >
      <Ionicons name={dir === 1 ? 'chevron-forward' : 'chevron-back'} size={18} color={colors.ink} />
    </Pressable>
  );

  return (
    <View>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.md, paddingRight: isWeb ? 40 : 0 }}
        scrollEventThrottle={32}
        onScroll={(e) => {
          x.current = e.nativeEvent.contentOffset.x;
          setAtStart(x.current <= 4);
          setAtEnd(x.current + e.nativeEvent.layoutMeasurement.width >= e.nativeEvent.contentSize.width - 4);
        }}
        onContentSizeChange={(w) => setAtEnd(w <= 0)}
      >
        {children}
      </ScrollView>
      {isWeb && !atEnd ? arrow(1) : null}
      {isWeb && !atStart ? arrow(-1) : null}
    </View>
  );
}

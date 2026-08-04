import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Polygon, Stop } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: [string, string];
  earned: boolean;
  size?: number;
}

/** Pointy-top hexagonal badge — vivid gradient + glow when earned,
 * greyed with a padlock when still locked. */
export function HexBadge({ id, icon, colors: [c1, c2], earned, size = 84 }: Props) {
  const { colors: theme } = useTheme();
  const h = size * 1.08;
  return (
    <View
      style={{
        width: size,
        height: h,
        alignItems: 'center',
        justifyContent: 'center',
        ...(earned
          ? { shadowColor: c2, shadowOpacity: 0.55, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 8 }
          : null),
      }}
    >
      <Svg width={size} height={h} viewBox="0 0 100 108">
        <Defs>
          <SvgGradient id={`hex-${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c1} />
            <Stop offset="1" stopColor={c2} />
          </SvgGradient>
        </Defs>
        {/* soft outer ring */}
        <Polygon
          points="50,1 96,27 96,81 50,107 4,81 4,27"
          fill="none"
          stroke={earned ? '#E7C878' : theme.border}
          strokeWidth={2.5}
        />
        <Polygon
          points="50,8 90,31 90,77 50,100 10,77 10,31"
          fill={earned ? `url(#hex-${id})` : theme.surfaceAlt}
          stroke={earned ? 'rgba(255,255,255,0.35)' : theme.border}
          strokeWidth={1.5}
        />
      </Svg>
      <View style={{ position: 'absolute' }}>
        <Ionicons name={earned ? icon : 'lock-closed'} size={size * 0.34} color={earned ? '#FFFFFF' : theme.inkFaint} />
      </View>
    </View>
  );
}

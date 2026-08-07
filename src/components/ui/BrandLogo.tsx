import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

/** Brand colors from the logo asset — fixed, not theme tokens. */
const BLUE = '#2D5BFF';
const GREEN = '#21C063';

interface Props {
  /** Mark height in px; wordmark scales with it. */
  height?: number;
  /** 'light' for dark/photo backgrounds ("Uni" turns white). */
  tone?: 'dark' | 'light';
  showWordmark?: boolean;
  showTagline?: boolean;
}

/** The UniBridge bridge-arc logo: gradient arch landing on two pillars. */
export function BrandLogo({ height = 30, tone = 'dark', showWordmark = true, showTagline = false }: Props) {
  const { colors } = useTheme();
  const w = (height / 96) * 120;
  const uni = tone === 'light' ? '#FFFFFF' : colors.ink;
  const bridge = tone === 'light' ? '#7FA3FF' : BLUE;
  const tag = tone === 'light' ? 'rgba(255,255,255,0.72)' : colors.inkSecondary;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: height * 0.32 }}>
      <Svg width={w} height={height} viewBox="0 0 120 96">
        <Defs>
          <SvgGradient id="ub-arc" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={BLUE} />
            <Stop offset="1" stopColor={GREEN} />
          </SvgGradient>
        </Defs>
        <Path d="M 15 76 Q 60 4 105 76" stroke="url(#ub-arc)" strokeWidth={16} strokeLinecap="round" fill="none" />
        <Circle cx={15} cy={76} r={13} fill={BLUE} />
        <Circle cx={105} cy={76} r={13} fill={GREEN} />
      </Svg>
      {showWordmark ? (
        <View>
          <Text style={{ fontFamily: fonts.black, fontSize: height * 0.74, lineHeight: height * 0.92, color: uni }}>
            Uni
            <Text style={{ fontFamily: fonts.black, fontSize: height * 0.74, color: bridge }}>Bridge</Text>
          </Text>
          {showTagline ? (
            <Text style={{ fontFamily: fonts.medium, fontSize: height * 0.32, color: tag, marginTop: 2 }}>
              Study abroad, together.
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

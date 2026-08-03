import { Text as RNText, type TextProps } from 'react-native';
import { typeScale } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export type TextVariant = keyof typeof typeScale;
export type TextTone = 'primary' | 'secondary' | 'faint' | 'accent' | 'danger' | 'onAccent' | 'inherit';

interface Props extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  color?: string;
  center?: boolean;
}

export function Text({ variant = 'body', tone = 'primary', color, center, style, ...rest }: Props) {
  const { colors } = useTheme();
  const toneColor =
    color ??
    (tone === 'inherit'
      ? undefined
      : {
          primary: colors.ink,
          secondary: colors.inkSecondary,
          faint: colors.inkFaint,
          accent: colors.accent,
          danger: colors.danger,
          onAccent: colors.onAccent,
        }[tone]);
  return (
    <RNText
      style={[typeScale[variant], toneColor ? { color: toneColor } : null, center && { textAlign: 'center' }, style]}
      {...rest}
    />
  );
}

import { TextInput, View, type TextInputProps } from 'react-native';
import { fonts, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '@/components/ui/Text';

interface Props extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
}

export function TextField({ label, hint, error, style, ...rest }: Props) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.xs + 2 }}>
      {label ? <Text variant="label">{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.inkFaint}
        style={[
          {
            minHeight: 50,
            borderRadius: radius.md,
            borderWidth: 1.5,
            borderColor: error ? colors.danger : colors.border,
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.lg,
            fontFamily: fonts.medium,
            fontSize: 16,
            color: colors.ink,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text variant="caption" tone="danger">{error}</Text>
      ) : hint ? (
        <Text variant="caption" tone="faint">{hint}</Text>
      ) : null}
    </View>
  );
}

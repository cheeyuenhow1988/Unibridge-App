import { Image } from 'expo-image';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';
import type { Institution } from '@/types/models';

interface Props {
  institution: Institution;
  size?: number;
  radius?: number;
}

/** Official-domain logo (Clearbit) with a graceful initial-letter fallback. */
export function InstLogo({ institution, size = 26, radius = 6 }: Props) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <View
        style={{
          width: size, height: size, borderRadius: radius, backgroundColor: colors.accentSoft,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Text variant="label" color={colors.accent} style={{ fontSize: Math.round(size * 0.45), lineHeight: Math.round(size * 0.6) }}>
          {institution.short[0]?.toUpperCase()}
        </Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: institution.logo }}
      style={{ width: size, height: size, borderRadius: radius, backgroundColor: '#FFFFFF' }}
      contentFit="contain"
      onError={() => setFailed(true)}
    />
  );
}

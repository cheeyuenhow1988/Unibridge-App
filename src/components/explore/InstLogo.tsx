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

const faviconFor = (website: string) =>
  `https://www.google.com/s2/favicons?domain=${new URL(website).hostname.replace(/^www\./, '')}&sz=128`;

/**
 * Verified official logo with a resilient chain: the baked logo URL first,
 * then the school's official favicon (covers networks where the primary
 * host is blocked), then an initial-letter tile.
 */
export function InstLogo({ institution, size = 26, radius = 6 }: Props) {
  const { colors } = useTheme();
  const [stage, setStage] = useState(0);
  const favicon = faviconFor(institution.website);
  const uri = stage === 0 ? institution.logo : favicon;

  // 'initials' is baked for schools with no fetchable mark anywhere —
  // skipping the favicon avoids Google's default globe placeholder.
  if (stage >= 2 || institution.logo === 'initials') {
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
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: radius, backgroundColor: '#FFFFFF' }}
      contentFit="contain"
      onError={() => setStage(uri === favicon ? 2 : stage + 1)}
    />
  );
}

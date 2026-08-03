import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { HCarousel } from '@/components/ui/HCarousel';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { FLAGS } from '@/constants/countries';
import { radius, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useTheme } from '@/hooks/useTheme';
import { listAmbassadorsByInstitution } from '@/services/api';

export function AmbassadorStrip({ institutionId }: { institutionId: string }) {
  const { colors } = useTheme();
  const { data, loading } = useAsync(() => listAmbassadorsByInstitution(institutionId), [institutionId]);

  if (loading) {
    return (
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        {[0, 1, 2].map((i) => <Skeleton key={i} width={86} height={110} style={{ borderRadius: radius.lg }} />)}
      </View>
    );
  }
  if (!data?.length) return null;
  return (
    <HCarousel step={208}>
      {data.map((amb) => (
        <Pressable
          key={amb.id}
          accessibilityRole="button"
          onPress={() => router.push(`/ambassador/${amb.id}`)}
          style={({ pressed }) => ({
            width: 92, alignItems: 'center', gap: spacing.xs, padding: spacing.sm,
            borderRadius: radius.lg, backgroundColor: colors.surface,
            borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.85 : 1,
          })}
        >
          <Image source={{ uri: amb.avatar }} style={{ width: 56, height: 56, borderRadius: radius.full, backgroundColor: colors.surfaceAlt }} />
          <Text variant="caption" numberOfLines={1}>{amb.name.split(' ')[0]}</Text>
          <Text variant="caption" tone="faint">{FLAGS[amb.homeCountry]}</Text>
        </Pressable>
      ))}
    </HCarousel>
  );
}

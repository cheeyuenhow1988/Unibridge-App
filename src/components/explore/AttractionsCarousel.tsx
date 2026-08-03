import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { Row } from '@/components/ui/Misc';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useTheme } from '@/hooks/useTheme';
import { listAttractions } from '@/services/api';
import type { AttractionType } from '@/types/models';

export const ATTRACTION_ICONS: Record<AttractionType, keyof typeof Ionicons.glyphMap> = {
  food: 'restaurant-outline',
  nature: 'leaf-outline',
  shopping: 'bag-handle-outline',
  landmark: 'camera-outline',
  nightlife: 'moon-outline',
  sports: 'football-outline',
};

export function AttractionsCarousel({ institutionId }: { institutionId: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { data, loading } = useAsync(() => listAttractions(institutionId), [institutionId]);

  if (loading) {
    return (
      <Row gap={spacing.md}>
        {[0, 1].map((i) => <Skeleton key={i} width={180} height={170} style={{ borderRadius: radius.lg }} />)}
      </Row>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
      {(data ?? []).map((a) => (
        <View
          key={a.id}
          style={{
            width: 180, borderRadius: radius.lg, backgroundColor: colors.surface,
            borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
          }}
        >
          <Image source={{ uri: a.image }} style={{ width: '100%', height: 90 }} contentFit="cover" transition={200} />
          <View style={{ padding: spacing.md, gap: 3 }}>
            <Text variant="label" numberOfLines={1}>{a.name}</Text>
            <Row gap={5}>
              <Ionicons name={ATTRACTION_ICONS[a.type]} size={13} color={colors.accent} />
              <Text variant="caption" tone="faint">
                {t(`attractionTypes.${a.type}`)} · {t('common.minutes', { count: a.distanceMinutes })}
              </Text>
            </Row>
            <Text variant="caption" tone="secondary" numberOfLines={2}>{a.description}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

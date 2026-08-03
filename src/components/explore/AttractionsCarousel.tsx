import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { HCarousel } from '@/components/ui/HCarousel';
import { Row } from '@/components/ui/Misc';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useTheme } from '@/hooks/useTheme';
import { listAttractions } from '@/services/api';
import { shareMessage } from '@/services/share';
import type { Attraction, AttractionType } from '@/types/models';

export const ATTRACTION_ICONS: Record<AttractionType, keyof typeof Ionicons.glyphMap> = {
  food: 'restaurant-outline',
  nature: 'leaf-outline',
  shopping: 'bag-handle-outline',
  landmark: 'camera-outline',
  nightlife: 'moon-outline',
  sports: 'football-outline',
};

function mapsUrl(a: Attraction, city: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${a.name} ${city}`)}`;
}

export function AttractionsCarousel({ institutionId, city }: { institutionId: string; city: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { data, loading } = useAsync(() => listAttractions(institutionId), [institutionId]);
  const [selected, setSelected] = useState<Attraction | null>(null);

  const share = async (a: Attraction) => {
    try {
      await shareMessage(`${a.name} · ${a.description}\n${mapsUrl(a, city)}`, t('common.copiedToClipboard'));
    } catch {
      Alert.alert(t('compare.shareUnavailable'));
    }
  };

  if (loading) {
    return (
      <Row gap={spacing.md}>
        {[0, 1].map((i) => <Skeleton key={i} width={180} height={170} style={{ borderRadius: radius.lg }} />)}
      </Row>
    );
  }
  return (
    <>
      <HCarousel step={196}>
        {(data ?? []).map((a) => (
          <Pressable
            key={a.id}
            accessibilityRole="button"
            onPress={() => setSelected(a)}
            style={({ pressed }) => ({
              width: 180, borderRadius: radius.lg, backgroundColor: colors.surface,
              borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
              opacity: pressed ? 0.88 : 1,
            })}
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
          </Pressable>
        ))}
      </HCarousel>

      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={() => setSelected(null)} />
        {selected ? (
          <SafeAreaView
            edges={['bottom']}
            style={{
              backgroundColor: colors.bg,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              maxHeight: '85%',
              overflow: 'hidden',
            }}
          >
            <ScrollView>
              <Image source={{ uri: selected.image.replace('/400/300', '/800/450') }} style={{ width: '100%', height: 200 }} contentFit="cover" transition={200} />
              <View style={{ padding: spacing.xl, gap: spacing.md }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text variant="title" style={{ flex: 1 }}>{selected.name}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => setSelected(null)} hitSlop={10}>
                    <Ionicons name="close" size={22} color={colors.inkSecondary} />
                  </Pressable>
                </Row>
                <Row gap={spacing.sm}>
                  <Badge tone="accent" icon={ATTRACTION_ICONS[selected.type]} label={t(`attractionTypes.${selected.type}`)} />
                  <Text variant="caption" tone="secondary">
                    {t('attraction.fromCampus', { count: selected.distanceMinutes })}
                  </Text>
                </Row>
                <Text variant="body" tone="secondary">{selected.description}</Text>

                <Text variant="label">{t('attraction.whatToDo')}</Text>
                {selected.tips.map((tip) => (
                  <Row key={tip} gap={spacing.sm} style={{ alignItems: 'flex-start' }}>
                    <Ionicons name="sparkles-outline" size={14} color={colors.accent} style={{ marginTop: 3 }} />
                    <Text variant="body" tone="secondary" style={{ flex: 1 }}>{tip}</Text>
                  </Row>
                ))}

                <Text variant="caption" tone="faint">{t('attraction.photoNote')}</Text>
                <Button
                  label={t('attraction.openMaps')}
                  icon="map-outline"
                  onPress={() => void Linking.openURL(mapsUrl(selected, city))}
                />
                <Button
                  label={t('attraction.shareSpot')}
                  icon="share-social-outline"
                  variant="secondary"
                  onPress={() => void share(selected)}
                />
              </View>
            </ScrollView>
          </SafeAreaView>
        ) : null}
      </Modal>
    </>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Row } from '@/components/ui/Misc';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useTheme } from '@/hooks/useTheme';
import { getSupportBundle, listAmbassadors } from '@/services/api';
import type { Short } from '@/types/models';

/**
 * "Reality Check" strip for course pages: 1-2 unscripted student clips about
 * this institution, deliberately rawer than the polished campus shorts.
 */
export function RealityShorts({ institutionId }: { institutionId: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const support = useAsync(() => getSupportBundle(), []);
  const ambassadors = useAsync(() => listAmbassadors(), []);
  const [playing, setPlaying] = useState<Short | null>(null);

  const clips = (support.data?.shorts ?? [])
    .filter((s) => s.reality && s.institutionId === institutionId)
    .slice(0, 2);
  if (clips.length === 0) return null;

  const ambName = (id: string) => ambassadors.data?.find((a) => a.id === id)?.name ?? '';

  return (
    <View style={{ gap: spacing.sm }}>
      <Row gap={spacing.sm}>
        <Badge tone="borderline" icon="flash-outline" label={t('shorts.realityTag')} />
        <Text variant="caption" tone="faint" style={{ flex: 1 }}>{t('shorts.realityNote')}</Text>
      </Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        {clips.map((s) => (
          <Pressable key={s.id} accessibilityRole="button" onPress={() => setPlaying(s)}>
            <View style={{ width: 150, gap: 4 }}>
              <View style={{ borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                <Image source={{ uri: s.thumb }} style={{ width: 150, height: 200 }} contentFit="cover" />
                <View
                  style={{
                    position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.7)',
                    borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2,
                  }}
                >
                  <Text variant="micro" color="#F2C14E">{t('shorts.realityTag').toUpperCase()}</Text>
                </View>
                <View
                  style={{
                    position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 4,
                    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2,
                  }}
                >
                  <Ionicons name="play" size={10} color="#FFFFFF" />
                  <Text variant="caption" color="#FFFFFF">{s.duration}s</Text>
                </View>
              </View>
              <Text variant="caption" numberOfLines={2}>{s.title}</Text>
              <Text variant="micro" tone="faint">{ambName(s.ambassadorId)}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <Modal visible={!!playing} animationType="fade" transparent onRequestClose={() => setPlaying(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: spacing.xl }} onPress={() => setPlaying(null)}>
          {playing ? (
            <View style={{ gap: spacing.md, alignItems: 'center' }}>
              <Image source={{ uri: playing.thumb }} style={{ width: 260, height: 400, borderRadius: radius.xl }} contentFit="cover" />
              <Text variant="label" color="#FFFFFF" center>{playing.title}</Text>
              <Text variant="caption" color="rgba(255,255,255,0.7)" center>
                {ambName(playing.ambassadorId)} · {playing.duration}s · {t('shorts.mockNote')}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

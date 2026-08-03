import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

const FEATURES = [
  { icon: 'home-outline', title: 'arrival.housing', desc: 'arrival.housingDesc' },
  { icon: 'car-outline', title: 'arrival.car', desc: 'arrival.carDesc' },
  { icon: 'briefcase-outline', title: 'arrival.jobs', desc: 'arrival.jobsDesc' },
  { icon: 'headset-outline', title: 'arrival.support', desc: 'arrival.supportDesc' },
] as const;

export default function ArrivalRoadmap() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Screen scroll edges={['top', 'bottom']}>
      <Row style={{ paddingVertical: spacing.md }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
      </Row>
      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Badge tone="accent" icon="rocket-outline" label={t('common.comingSoon')} />
          <Text variant="display">{t('arrival.title')}</Text>
          <Text variant="body" tone="secondary">{t('arrival.subtitle')}</Text>
        </View>

        {FEATURES.map((f, i) => (
          <Card key={f.title} style={{ gap: spacing.sm }}>
            <Row gap={spacing.md}>
              <View
                style={{
                  width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.accentSoft,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name={f.icon} size={22} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="sub">{t(f.title)}</Text>
                <Text variant="caption" tone="secondary">{t(f.desc)}</Text>
              </View>
              <Text variant="micro" tone="faint">{`0${i + 1}`}</Text>
            </Row>
          </Card>
        ))}

        <Text variant="caption" tone="faint" center>{t('arrival.notify')}</Text>
      </View>
    </Screen>
  );
}

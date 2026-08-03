import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, View, useWindowDimensions } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { FLAGS } from '@/constants/countries';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { loadDemoProfile } from '@/store/seedDemo';

const SLIDES = [
  { key: '1', icon: 'school-outline', title: 'onboarding.slide1Title', body: 'onboarding.slide1Body' },
  { key: '2', icon: 'wallet-outline', title: 'onboarding.slide2Title', body: 'onboarding.slide2Body' },
  { key: '3', icon: 'paper-plane-outline', title: 'onboarding.slide3Title', body: 'onboarding.slide3Body' },
] as const;

export default function Welcome() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const [demoLoading, setDemoLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const startDemo = async () => {
    setDemoLoading(true);
    await loadDemoProfile();
    router.replace('/(tabs)/match');
  };

  return (
    <Screen padded={false} edges={['top', 'bottom']}>
      <View style={{ alignItems: 'center', paddingTop: spacing.xl }}>
        <Text variant="heading" tone="accent">{t('common.appName')}</Text>
        <Text variant="caption" tone="faint" style={{ marginTop: spacing.xs }}>
          {Object.values(FLAGS).slice(0, 7).join('  ')}
        </Text>
      </View>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={{ width, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.xl }}>
            <View
              style={{
                width: 140, height: 140, borderRadius: radius.full, backgroundColor: colors.accentSoft,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name={item.icon} size={62} color={colors.accent} />
            </View>
            <Text variant="display" center>{t(item.title)}</Text>
            <Text variant="body" tone="secondary" center style={{ maxWidth: 320 }}>
              {t(item.body)}
            </Text>
          </View>
        )}
      />
      <View style={{ padding: spacing.xl, gap: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.sm }}>
          {SLIDES.map((s, i) => (
            <View
              key={s.key}
              style={{
                width: i === page ? 22 : 8, height: 8, borderRadius: radius.full,
                backgroundColor: i === page ? colors.accent : colors.border,
              }}
            />
          ))}
        </View>
        <Button
          label={page < SLIDES.length - 1 ? t('common.next') : t('onboarding.getStarted')}
          size="lg"
          onPress={() => {
            if (page < SLIDES.length - 1) {
              listRef.current?.scrollToIndex({ index: page + 1, animated: true });
              setPage(page + 1);
            } else {
              router.push('/onboarding/profile');
            }
          }}
        />
        <Pressable onPress={startDemo} disabled={demoLoading} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text variant="label" tone="accent" center>
            {t('onboarding.tryDemo')}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

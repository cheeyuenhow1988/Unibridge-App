import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { FLAGS } from '@/constants/countries';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { loadDemoProfile } from '@/store/seedDemo';

const SLIDES = [
  { key: '1', tag: 'onboarding.slide1Tag', titleA: 'onboarding.slide1TitleA', titleB: 'onboarding.slide1TitleB', body: 'onboarding.slide1Body' },
  { key: '2', tag: 'onboarding.slide2Tag', titleA: 'onboarding.slide2TitleA', titleB: 'onboarding.slide2TitleB', body: 'onboarding.slide2Body' },
  { key: '3', tag: 'onboarding.slide3Tag', titleA: 'onboarding.slide3TitleA', titleB: 'onboarding.slide3TitleB', body: 'onboarding.slide3Body' },
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
    <LinearGradient colors={[colors.gradientFrom, colors.gradientTo]} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <View style={{ alignItems: 'center', paddingTop: spacing.xl, gap: spacing.xs }}>
          <Text variant="heading" color={colors.onGradient}>{t('common.appName')}</Text>
          <Text variant="caption" color={colors.onGradientSoft}>
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
          renderItem={({ item, index }) => (
            <View style={{ width, justifyContent: 'center', padding: spacing.xxl, gap: spacing.xl }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.pop }} />
                <Text variant="micro" color={colors.pop} style={{ letterSpacing: 2.5 }}>
                  {`0${index + 1} — ${t(item.tag).toUpperCase()}`}
                </Text>
              </View>
              <Text variant="hero" color={colors.onGradient}>
                {t(item.titleA)}{' '}
                <Text variant="hero" color={colors.pop}>{t(item.titleB)}</Text>
              </Text>
              <Text variant="body" color={colors.onGradientSoft} style={{ maxWidth: 320, fontSize: 16, lineHeight: 24 }}>
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
                  width: i === page ? 26 : 8, height: 8, borderRadius: radius.full,
                  backgroundColor: i === page ? colors.pop : colors.gradientTrack,
                }}
              />
            ))}
          </View>
          <Button
            label={page < SLIDES.length - 1 ? t('common.next') : t('onboarding.getStarted')}
            size="lg"
            variant="pop"
            onPress={() => {
              if (page < SLIDES.length - 1) {
                listRef.current?.scrollToIndex({ index: page + 1, animated: true });
                setPage(page + 1);
              } else {
                router.push('/onboarding/profile');
              }
            }}
          />
          <Pressable
            onPress={startDemo}
            disabled={demoLoading}
            accessibilityRole="button"
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text variant="label" color={colors.onGradient} center style={{ textDecorationLine: 'underline' }}>
              {t('onboarding.tryDemo')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

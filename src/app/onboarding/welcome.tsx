import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLogo } from '@/components/ui/BrandLogo';
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

// Real, byte-verified campus photos (same Commons pipeline as the school
// galleries) — one backdrop per slide, crossfading as the pager moves.
const BACKDROPS = [
  'Main_Walkway,_Lower_campus_UNSW.jpg',
  'University_of_Sydney_Main_Quadrangle.jpg',
  'NUS,_University_Cultural_Centre_3,_Nov_06.JPG',
].map((f) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f)}?width=1200`);

export default function Welcome() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const [demoLoading, setDemoLoading] = useState(false);
  const pagerRef = useRef<ScrollView>(null);

  const startDemo = async () => {
    setDemoLoading(true);
    await loadDemoProfile();
    router.replace('/(tabs)/match');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0B1735' }}>
      <Image
        source={{ uri: BACKDROPS[page] ?? BACKDROPS[0] }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={500}
      />
      <LinearGradient
        colors={['rgba(9, 18, 46, 0.42)', 'rgba(9, 18, 46, 0.68)', 'rgba(7, 13, 34, 0.94)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <StatusBar style="light" />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <View style={{ alignItems: 'center', paddingTop: spacing.xl, gap: spacing.sm }}>
          <BrandLogo height={30} tone="light" showTagline />
          <Text variant="caption" color={colors.onGradientSoft}>
            {(['AU', 'CA', 'CN', 'GB', 'MY', 'NZ', 'RU', 'SG', 'TW', 'US'] as const)
              .map((c) => FLAGS[c])
              .join('  ')}
          </Text>
        </View>

        {/* ScrollView + scrollTo, not FlatList scrollToIndex — the latter is
            a no-op on web, which froze every slide on slogan 01. */}
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {SLIDES.map((item, index) => (
            <View key={item.key} style={{ width, height: '100%', justifyContent: 'center', padding: spacing.xxl, gap: spacing.xl }}>
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
          ))}
        </ScrollView>

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
                pagerRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
                setPage(page + 1);
              } else {
                router.push('/onboarding/auth');
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
    </View>
  );
}

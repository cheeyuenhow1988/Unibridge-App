import i18n from '@/i18n';
import {
  Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { GlobalTabBar } from '@/components/ui/GlobalTabBar';
import { ToastHost } from '@/components/ui/Toast';
import { useTheme } from '@/hooks/useTheme';
import { initLiveRates } from '@/services/currency';
import { useProfileStore } from '@/store/useProfileStore';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colors, scheme } = useTheme();
  const hydrated = useProfileStore((s) => s.hydrated);
  const language = useProfileStore((s) => s.language);
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  // Upgrade the bundled FX snapshot to live rates before first paint (2.5s cap).
  const [fxReady, setFxReady] = useState(false);
  useEffect(() => {
    void initLiveRates().finally(() => setFxReady(true));
  }, []);

  const ready = fontsLoaded && hydrated && fxReady;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    if (i18n.language !== language) void i18n.changeLanguage(language);
  }, [language]);

  if (!ready) return null;

  const stack = (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="compare" options={{ presentation: 'modal' }} />
        <Stack.Screen name="apply/[courseId]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="chat/[institutionId]" options={{ presentation: 'modal' }} />
      </Stack>
      <GlobalTabBar />
      <ToastHost />
    </View>
  );

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {Platform.OS === 'web' ? (
        // Desktop browsers get a centered phone-width canvas instead of
        // stretching cards across the full window.
        <View style={{ flex: 1, backgroundColor: scheme === 'dark' ? '#080B10' : '#EEECE5', alignItems: 'center' }}>
          <View style={{ flex: 1, width: '100%', maxWidth: 480 }}>{stack}</View>
        </View>
      ) : (
        stack
      )}
    </>
  );
}

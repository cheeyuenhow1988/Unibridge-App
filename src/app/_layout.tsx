import '@/i18n';
import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import {
  Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useProfileStore } from '@/store/useProfileStore';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colors, scheme } = useTheme();
  const hydrated = useProfileStore((s) => s.hydrated);
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  const ready = fontsLoaded && hydrated;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
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
    </>
  );
}

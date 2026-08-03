import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

const ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  match: ['sparkles-outline', 'sparkles'],
  explore: ['compass-outline', 'compass'],
  applications: ['documents-outline', 'documents'],
  community: ['people-outline', 'people'],
  profile: ['person-circle-outline', 'person-circle'],
};

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        tabBarIcon: ({ color, size, focused }) => {
          const [outline, filled] = ICONS[route.name] ?? ICONS.match;
          return <Ionicons name={focused ? filled : outline} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="match" options={{ title: t('tabs.match') }} />
      <Tabs.Screen name="explore" options={{ title: t('tabs.explore') }} />
      <Tabs.Screen name="applications" options={{ title: t('tabs.applications') }} />
      <Tabs.Screen name="community" options={{ title: t('tabs.community') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
    </Tabs>
  );
}

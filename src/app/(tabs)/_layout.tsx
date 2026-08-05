import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { SosButton } from '@/components/safety/SosButton';
import { fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useApplicationsStore } from '@/store/useApplicationsStore';
import { useCommunityStore } from '@/store/useCommunityStore';

const ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  match: ['school-outline', 'school'],
  explore: ['compass-outline', 'compass'],
  applications: ['documents-outline', 'documents'],
  assistant: ['sparkles-outline', 'sparkles'],
  community: ['people-outline', 'people'],
  chats: ['chatbubbles-outline', 'chatbubbles'],
  profile: ['person-circle-outline', 'person-circle'],
};

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const unread = useApplicationsStore((s) => s.notifications.filter((n) => !n.read).length);
  const requestCount = useCommunityStore(
    (s) => Object.values(s.mateLinks).filter((l) => l.status === 'incoming').length,
  );
  return (
    <View style={{ flex: 1 }}>
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
      <Tabs.Screen
        name="applications"
        options={{
          title: t('tabs.applications'),
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, color: colors.onAccent, fontFamily: fonts.bold, fontSize: 10 },
        }}
      />
      <Tabs.Screen name="assistant" options={{ title: t('tabs.assistant') }} />
      <Tabs.Screen name="community" options={{ title: t('tabs.community') }} />
      <Tabs.Screen
        name="chats"
        options={{
          title: t('tabs.chats'),
          tabBarBadge: requestCount > 0 ? requestCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, color: colors.onAccent, fontFamily: fonts.bold, fontSize: 10 },
        }}
      />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
      </Tabs>
      <SosButton />
    </View>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useApplicationsStore } from '@/store/useApplicationsStore';
import { useCommunityStore } from '@/store/useCommunityStore';
import { useProfileStore } from '@/store/useProfileStore';

const TABS = [
  { key: 'match', path: '/match', icons: ['school-outline', 'school'] },
  { key: 'explore', path: '/explore', icons: ['compass-outline', 'compass'] },
  { key: 'applications', path: '/applications', icons: ['documents-outline', 'documents'] },
  { key: 'assistant', path: '/assistant', icons: ['sparkles-outline', 'sparkles'] },
  { key: 'community', path: '/community', icons: ['people-outline', 'people'] },
  { key: 'chats', path: '/chats', icons: ['chatbubbles-outline', 'chatbubbles'] },
  { key: 'profile', path: '/profile', icons: ['person-circle-outline', 'person-circle'] },
] as const;

/** Which tab a detail screen belongs to — drives the highlight. */
const PARENT: [RegExp, string][] = [
  [/^\/(course|compare|apply)\b/, '/match'],
  [/^\/(institution|chat)\b/, '/explore'],
  [/^\/(application|predeparture|offers|mail)\b/, '/applications'],
  [/^\/(group|ambassador|arrival)\b/, '/community'],
  [/^\/mate\b/, '/chats'],
  [/^\/(safety|vault|rewards|pass|vip|parent)\b/, '/profile'],
];

/** Persistent bottom bar for every screen OUTSIDE the tab group, so the app
 * never loses its main navigation on detail pages. Tab screens keep the
 * native bar and this one stays hidden there. */
export function GlobalTabBar() {
  const pathname = usePathname();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const onboarded = useProfileStore((s) => s.onboarded);
  const unread = useApplicationsStore((s) => s.notifications.filter((n) => !n.read).length);
  const requests = useCommunityStore(
    (s) => Object.values(s.mateLinks).filter((l) => l.status === 'incoming').length,
  );

  const isTabRoot = TABS.some((x) => pathname === x.path);
  if (!onboarded || isTabRoot || pathname === '/' || pathname.startsWith('/onboarding') || pathname.startsWith('/reset')) {
    return null;
  }
  const active = PARENT.find(([re]) => re.test(pathname))?.[1];

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 7,
        paddingBottom: Math.max(insets.bottom, 8),
      }}
    >
      {TABS.map(({ key, path, icons }) => {
        const focused = active === path;
        const tint = focused ? colors.accent : colors.inkFaint;
        const badge = key === 'applications' ? unread : key === 'chats' ? requests : 0;
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={t(`tabs.${key}`)}
            onPress={() => router.navigate(path as never)}
            style={{ flex: 1, alignItems: 'center', gap: 2 }}
          >
            <View>
              <Ionicons name={(focused ? icons[1] : icons[0]) as never} size={22} color={tint} />
              {badge > 0 ? (
                <View
                  style={{
                    position: 'absolute', top: -4, right: -10, minWidth: 16, height: 16, borderRadius: 8,
                    backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
                  }}
                >
                  <Text style={{ color: colors.onAccent, fontSize: 9, fontFamily: fonts.bold }}>{badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={{ color: tint, fontSize: 9.5, fontFamily: fonts.semibold, letterSpacing: -0.1 }} numberOfLines={1}>
              {t(`tabs.${key}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

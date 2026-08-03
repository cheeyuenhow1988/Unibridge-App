import { useColorScheme } from 'react-native';
import { dark, light, type ThemeColors } from '@/constants/theme';
import { useProfileStore } from '@/store/useProfileStore';

export function useTheme(): { colors: ThemeColors; scheme: 'light' | 'dark' } {
  const system = useColorScheme();
  const pref = useProfileStore((s) => s.themePref);
  const scheme = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  return { colors: scheme === 'dark' ? dark : light, scheme };
}

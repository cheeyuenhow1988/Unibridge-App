/**
 * UniBridge design system — "Cobalt" (client-specified palette).
 *
 * Premium fintech trust with youthful international energy: crisp white and
 * warm off-white, deep cobalt primary, emerald/amber/sky state colors, and a
 * cobalt→sky gradient for match moments. Apple-clean sans hierarchy (Manrope).
 * Every text/background pair below is WCAG 2.1 AA-solved; the client's raw
 * state hues live in the soft fills while text variants carry the contrast.
 */
export const light = {
  bg: '#FAF9F6',
  surface: '#FFFFFF',
  surfaceAlt: '#F1EFE9',
  ink: '#1F1F1F',
  inkSecondary: '#6B6B6B',
  inkFaint: '#5F6B7A',
  border: '#E8E5DD',
  accent: '#2447DB',
  accentPressed: '#1F3FC9',
  accentSoft: '#E3EAFF',
  onAccent: '#FFFFFF',
  eligible: '#0B7A47',
  eligibleSoft: '#DCF5E9',
  borderline: '#955C09',
  borderlineSoft: '#FCEFD3',
  pathway: '#086C9E',
  pathwaySoft: '#E0F3FC',
  danger: '#B42318',
  dangerSoft: '#FCE4E1',
  verified: '#77590E',
  verifiedSoft: '#F4EACC',
  skeleton: '#EAE7DF',
  overlay: 'rgba(20, 25, 35, 0.55)',
  pop: '#86DBFF',
  popSoft: '#E0F3FC',
  onPop: '#14202E',
  gradientFrom: '#2447DB',
  gradientTo: '#0C6EAA',
  onGradient: '#FFFFFF',
  onGradientSoft: 'rgba(255, 255, 255, 0.8)',
  gradientTrack: 'rgba(255, 255, 255, 0.22)',
} as const;

export const dark: ThemeColors = {
  bg: '#0D1117',
  surface: '#161C24',
  surfaceAlt: '#1D2530',
  ink: '#EDF1F7',
  inkSecondary: '#A9B1BF',
  inkFaint: '#98A2B3',
  border: '#2A3341',
  accent: '#8AA6FF',
  accentPressed: '#A6BBFF',
  accentSoft: '#1A2440',
  onAccent: '#0B1220',
  eligible: '#57D9A3',
  eligibleSoft: '#12301F',
  borderline: '#F5B759',
  borderlineSoft: '#33270F',
  pathway: '#7CC8F2',
  pathwaySoft: '#10283A',
  danger: '#F08B80',
  dangerSoft: '#3A1F1C',
  verified: '#E2C15E',
  verifiedSoft: '#2E2711',
  skeleton: '#232B36',
  overlay: 'rgba(0, 0, 0, 0.6)',
  pop: '#86DBFF',
  popSoft: '#10283A',
  onPop: '#0B1220',
  gradientFrom: '#2A50EE',
  gradientTo: '#12224E',
  onGradient: '#FFFFFF',
  onGradientSoft: 'rgba(255, 255, 255, 0.8)',
  gradientTrack: 'rgba(255, 255, 255, 0.22)',
};

export type ThemeColors = { [K in keyof typeof light]: string };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;

export const radius = { sm: 10, md: 14, lg: 18, xl: 24, full: 999 } as const;

export const fonts = {
  display: 'Manrope_700Bold',
  displayBold: 'Manrope_800ExtraBold',
  black: 'Manrope_800ExtraBold',
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

export const typeScale = {
  hero: { fontFamily: fonts.extrabold, fontSize: 38, lineHeight: 44, letterSpacing: -1 },
  display: { fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 38, letterSpacing: -0.8 },
  title: { fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32, letterSpacing: -0.5 },
  heading: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  sub: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 17, letterSpacing: 0.1 },
  micro: { fontFamily: fonts.bold, fontSize: 10.5, lineHeight: 14, letterSpacing: 0.6 },
} as const;

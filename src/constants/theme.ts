/**
 * UniBridge design system.
 *
 * Direction: optimistic, international, trustworthy — editorial-fintech rather
 * than school-portal. Typography-led (Fraunces display serif + Manrope UI),
 * one committed accent (deep teal) on warm ivory neutrals, generous spacing,
 * WCAG-AA contrast in both schemes.
 */
export const light = {
  bg: '#F6F4EF',
  surface: '#FFFFFF',
  surfaceAlt: '#EDEAE2',
  ink: '#172723',
  inkSecondary: '#57675F',
  inkFaint: '#647370',
  border: '#E3DFD5',
  accent: '#0C6F60',
  accentPressed: '#0A5C50',
  accentSoft: '#DCEDE8',
  onAccent: '#FFFFFF',
  eligible: '#0C6F60',
  eligibleSoft: '#DCEDE8',
  borderline: '#96500A',
  borderlineSoft: '#F7E9D3',
  pathway: '#3A57C4',
  pathwaySoft: '#E3E8F8',
  danger: '#AC3A30',
  dangerSoft: '#F8E3E1',
  verified: '#77590E',
  verifiedSoft: '#F4EACC',
  skeleton: '#E7E3DA',
  overlay: 'rgba(23, 39, 35, 0.55)',
  pop: '#C8F14A',
  popSoft: '#EFF8D0',
  onPop: '#172723',
  gradientFrom: '#0D7A68',
  gradientTo: '#083D33',
  onGradient: '#FFFFFF',
  onGradientSoft: 'rgba(255, 255, 255, 0.78)',
  gradientTrack: 'rgba(255, 255, 255, 0.22)',
} as const;

export const dark: ThemeColors = {
  bg: '#101917',
  surface: '#1A2421',
  surfaceAlt: '#222E2A',
  ink: '#ECF2EF',
  inkSecondary: '#A4B5AE',
  inkFaint: '#82938C',
  border: '#2B3833',
  accent: '#3FCDB1',
  accentPressed: '#63DCC4',
  accentSoft: '#17302A',
  onAccent: '#0A1512',
  eligible: '#3FCDB1',
  eligibleSoft: '#17302A',
  borderline: '#E8A23D',
  borderlineSoft: '#332711',
  pathway: '#93A9F2',
  pathwaySoft: '#1C2438',
  danger: '#E5766C',
  dangerSoft: '#3A201D',
  verified: '#E2C15E',
  verifiedSoft: '#2E2711',
  skeleton: '#243029',
  overlay: 'rgba(0, 0, 0, 0.6)',
  pop: '#CDF463',
  popSoft: '#2A3313',
  onPop: '#0A1512',
  gradientFrom: '#12564A',
  gradientTo: '#0B211D',
  onGradient: '#FFFFFF',
  onGradientSoft: 'rgba(255, 255, 255, 0.78)',
  gradientTrack: 'rgba(255, 255, 255, 0.22)',
};

export type ThemeColors = { [K in keyof typeof light]: string };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, full: 999 } as const;

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  black: 'Fraunces_900Black',
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

export const typeScale = {
  hero: { fontFamily: fonts.black, fontSize: 40, lineHeight: 44, letterSpacing: -1.2 },
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, letterSpacing: -0.7 },
  title: { fontFamily: fonts.display, fontSize: 27, lineHeight: 33, letterSpacing: -0.5 },
  heading: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  sub: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 17, letterSpacing: 0.1 },
  micro: { fontFamily: fonts.bold, fontSize: 10.5, lineHeight: 14, letterSpacing: 0.6 },
} as const;

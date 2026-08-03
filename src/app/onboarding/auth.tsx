import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Divider, Row } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { hapticSuccess } from '@/services/haptics';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/store/useToastStore';
import type { AuthProvider } from '@/store/useAuthStore';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const signIn = useAuthStore((s) => s.signIn);
  const [mode, setMode] = useState<'buttons' | 'email' | 'social'>('buttons');
  const [provider, setProvider] = useState<AuthProvider>('email');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const finish = (p: AuthProvider) => {
    signIn({ name: name.trim(), email: email.trim().toLowerCase(), provider: p });
    hapticSuccess();
    toast(t('auth.signedIn', { name: name.trim().split(' ')[0] }));
    router.push('/onboarding/profile');
  };

  const submit = () => {
    setError(null);
    if (!name.trim()) return setError(t('auth.nameRequired'));
    if (!EMAIL_RE.test(email.trim())) return setError(t('auth.emailInvalid'));
    if (mode === 'email' && password.length < 8) return setError(t('auth.passwordShort'));
    finish(mode === 'email' ? 'email' : provider);
  };

  const social = (p: AuthProvider) => {
    setProvider(p);
    setMode('social');
  };

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={{ gap: spacing.xl, paddingTop: spacing.xl }}>
        <Row>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => (mode === 'buttons' ? router.back() : setMode('buttons'))} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Pressable>
        </Row>
        <View style={{ gap: spacing.sm }}>
          <Text variant="title">{t('auth.title')}</Text>
          <Text variant="body" tone="secondary">{t('auth.subtitle')}</Text>
        </View>

        {mode === 'buttons' ? (
          <View style={{ gap: spacing.md }}>
            <Button label={t('auth.google')} icon="logo-google" variant="secondary" size="lg" onPress={() => social('google')} />
            <Button label={t('auth.apple')} icon="logo-apple" variant="secondary" size="lg" onPress={() => social('apple')} />
            <Row gap={spacing.md} style={{ marginVertical: spacing.xs }}>
              <Divider style={{ flex: 1 }} />
              <Text variant="caption" tone="faint">{t('auth.or')}</Text>
              <Divider style={{ flex: 1 }} />
            </Row>
            <Button label={t('auth.email')} icon="mail-outline" size="lg" onPress={() => setMode('email')} />
            <Text variant="caption" tone="faint" center>{t('auth.terms')}</Text>
          </View>
        ) : (
          <View style={{ gap: spacing.lg }}>
            {mode === 'social' ? (
              <View
                style={{
                  borderRadius: radius.md, backgroundColor: colors.surfaceAlt,
                  padding: spacing.md, gap: spacing.xs,
                }}
              >
                <Row gap={spacing.sm}>
                  <Ionicons name={provider === 'google' ? 'logo-google' : 'logo-apple'} size={16} color={colors.ink} />
                  <Text variant="label">{provider === 'google' ? t('auth.viaGoogle') : t('auth.viaApple')}</Text>
                  <Badge tone="neutral" label={t('common.demo')} />
                </Row>
                <Text variant="caption" tone="faint">{t('auth.socialMockNote')}</Text>
              </View>
            ) : null}
            <TextField
              label={t('onboarding.nameLabel')}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              placeholder={t('onboarding.namePlaceholder')}
            />
            <TextField
              label={t('auth.emailLabel')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="you@email.com"
            />
            {mode === 'email' ? (
              <TextField
                label={t('auth.passwordLabel')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                hint={t('auth.passwordHint')}
              />
            ) : null}
            {error ? <Text variant="caption" tone="danger">{error}</Text> : null}
            <Button label={t('auth.continue')} size="lg" onPress={submit} />
            <Text variant="caption" tone="faint" center>{t('auth.localNote')}</Text>
          </View>
        )}
      </View>
    </Screen>
  );
}

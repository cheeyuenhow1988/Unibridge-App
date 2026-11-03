import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { AuthUiError, completeSignIn, currentUser, setNewPassword } from '@/services/auth';
import { hapticSuccess } from '@/services/haptics';
import { clearAuthHash, initialAuthLinkFailed, isBackendConfigured } from '@/services/supabase';
import { toast } from '@/store/useToastStore';

/** Where the password-reset email's link lands (live build). */
export default function AuthReset() {
  if (!isBackendConfigured) return <Redirect href="/" />;
  return <LiveReset />;
}

function LiveReset() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [state, setState] = useState<'checking' | 'form' | 'expired'>(initialAuthLinkFailed ? 'expired' : 'checking');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initialAuthLinkFailed) {
      void currentUser().finally(clearAuthHash);
      return undefined;
    }
    let cancelled = false;
    // The link signs the student in with a short recovery session.
    void currentUser().then((user) => {
      clearAuthHash();
      if (!cancelled) setState(user ? 'form' : 'expired');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    setError(null);
    if (password.length < 8) return setError(t('auth.passwordShort'));
    if (password !== repeat) return setError(t('auth.passwordMismatch'));
    setBusy(true);
    try {
      await setNewPassword(password);
      const user = await currentUser();
      const dest = user ? await completeSignIn(user) : '/onboarding/profile';
      hapticSuccess();
      toast(t('auth.resetDone'));
      router.replace(dest);
    } catch (e) {
      const kind = e instanceof AuthUiError ? e.kind : 'generic';
      setError(
        kind === 'rate_limit' ? t('auth.errRateLimit')
          : kind === 'network' ? t('auth.errNetwork')
            : t('auth.errGeneric', { message: (e as Error).message }),
      );
    } finally {
      setBusy(false);
    }
  };

  if (state === 'checking') {
    return (
      <Screen edges={['top', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={{ gap: spacing.xl, paddingTop: spacing.xxl }}>
        <View
          style={{
            width: 72, height: 72, borderRadius: radius.full, backgroundColor: colors.surfaceAlt,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ionicons
            name={state === 'form' ? 'key-outline' : 'time-outline'}
            size={36}
            color={state === 'form' ? colors.accent : colors.danger}
          />
        </View>
        <View style={{ gap: spacing.sm }}>
          <Text variant="title" testID="reset-title">
            {state === 'form' ? t('auth.resetTitle') : t('auth.linkExpiredTitle')}
          </Text>
          {state === 'expired' ? <Text variant="body" tone="secondary">{t('auth.resetExpiredBody')}</Text> : null}
        </View>

        {state === 'form' ? (
          <View style={{ gap: spacing.lg }}>
            <TextField
              label={t('auth.passwordLabel')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              hint={t('auth.passwordHint')}
              testID="reset-password"
            />
            <TextField
              label={t('auth.repeatPassword')}
              value={repeat}
              onChangeText={setRepeat}
              secureTextEntry
              autoComplete="new-password"
              testID="reset-repeat"
            />
            {error ? <Text variant="caption" tone="danger" testID="reset-error">{error}</Text> : null}
            <Button label={t('auth.resetCta')} size="lg" loading={busy} disabled={busy} onPress={() => void save()} testID="reset-submit" />
          </View>
        ) : (
          <Button label={t('auth.forgotCta')} size="lg" onPress={() => router.replace('/onboarding/auth?mode=forgot')} testID="reset-request-new" />
        )}
      </View>
    </Screen>
  );
}

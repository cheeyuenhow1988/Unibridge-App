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
import { type AfterSignIn, AuthUiError, completeSignIn, currentUser, resendConfirmation } from '@/services/auth';
import { hapticSuccess } from '@/services/haptics';
import { clearAuthHash, initialAuthLinkFailed, isBackendConfigured } from '@/services/supabase';
import { useAuthStore } from '@/store/useAuthStore';

type State = 'checking' | 'confirmed' | 'expired' | 'nosession';

/** Where the sign-up confirmation email's link lands (live build). */
export default function AuthCallback() {
  if (!isBackendConfigured) return <Redirect href="/" />;
  return <LiveCallback />;
}

function LiveCallback() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  // Expired or already-used links arrive as #error_code=otp_expired…
  const [state, setState] = useState<State>(initialAuthLinkFailed ? 'expired' : 'checking');
  const [dest, setDest] = useState<AfterSignIn>('/onboarding/profile');
  const [email, setEmail] = useState(useAuthStore.getState().account?.email ?? '');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    if (initialAuthLinkFailed) {
      void currentUser().finally(clearAuthHash);
      return undefined;
    }
    let cancelled = false;
    void (async () => {
      const user = await currentUser();
      clearAuthHash();
      if (cancelled) return;
      if (!user) {
        setState('nosession');
        return;
      }
      const next = await completeSignIn(user);
      if (cancelled) return;
      setDest(next);
      setState('confirmed');
      hapticSuccess();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const resend = async () => {
    setBusy(true);
    try {
      await resendConfirmation(email.trim().toLowerCase());
      setNote({ text: t('auth.resent'), error: false });
    } catch (e) {
      const kind = e instanceof AuthUiError ? e.kind : 'generic';
      setNote({
        text: kind === 'rate_limit' ? t('auth.errRateLimit')
          : kind === 'network' ? t('auth.errNetwork')
            : t('auth.errGeneric', { message: (e as Error).message }),
        error: true,
      });
    } finally {
      setBusy(false);
    }
  };

  const icon = state === 'confirmed' ? 'checkmark-circle' : state === 'expired' ? 'time-outline' : 'mail-open-outline';
  const tint = state === 'confirmed' ? colors.eligible : state === 'expired' ? colors.danger : colors.accent;

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={{ gap: spacing.xl, paddingTop: spacing.xxl }}>
        {state === 'checking' ? (
          <View style={{ alignItems: 'center', gap: spacing.lg, paddingTop: spacing.xxl }}>
            <ActivityIndicator color={colors.accent} />
            <Text variant="label" tone="secondary">{t('auth.confirming')}</Text>
          </View>
        ) : (
          <>
            <View
              style={{
                width: 72, height: 72, borderRadius: radius.full, backgroundColor: colors.surfaceAlt,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name={icon} size={38} color={tint} />
            </View>
            <View style={{ gap: spacing.sm }}>
              <Text variant="title" testID="callback-title">
                {state === 'confirmed' ? t('auth.confirmedTitle')
                  : state === 'expired' ? t('auth.linkExpiredTitle') : t('auth.title')}
              </Text>
              <Text variant="body" tone="secondary">
                {state === 'confirmed' ? t('auth.confirmedBody')
                  : state === 'expired' ? t('auth.linkExpiredBody') : t('auth.subtitle')}
              </Text>
            </View>
          </>
        )}

        {state === 'confirmed' ? (
          <Button label={t('auth.continueApp')} size="lg" onPress={() => router.replace(dest)} testID="callback-continue" />
        ) : null}

        {state === 'expired' ? (
          <View style={{ gap: spacing.md }}>
            <TextField
              label={t('auth.emailLabel')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="you@email.com"
            />
            {note ? (
              <Text variant="caption" tone={note.error ? 'danger' : undefined} color={note.error ? undefined : colors.eligible}>
                {note.text}
              </Text>
            ) : null}
            <Button label={t('auth.resend')} icon="mail-outline" loading={busy} disabled={busy || !email.trim()} onPress={() => void resend()} />
            <Button label={t('auth.tabSignIn')} variant="secondary" onPress={() => router.replace('/onboarding/auth?mode=signin')} testID="callback-signin" />
          </View>
        ) : null}

        {state === 'nosession' ? (
          <View style={{ gap: spacing.md }}>
            <Button label={t('auth.tabSignIn')} size="lg" onPress={() => router.replace('/onboarding/auth?mode=signin')} />
            <Button label={t('auth.tabSignUp')} variant="secondary" onPress={() => router.replace('/onboarding/auth')} />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

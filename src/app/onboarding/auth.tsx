import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '@/services/nav';
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
import {
  AuthUiError, completeSignIn, currentUser, resendConfirmation, sendPasswordReset, signIn as liveSignIn, signUp,
} from '@/services/auth';
import { hapticSuccess } from '@/services/haptics';
import { isBackendConfigured } from '@/services/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';
import { toast } from '@/store/useToastStore';
import type { AuthProvider } from '@/store/useAuthStore';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Prototype sign-in: creates an account that lives only on this device. */
function DemoAuth() {
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
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => (mode === 'buttons' ? goBack('/onboarding/welcome') : setMode('buttons'))} hitSlop={10}>
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

type LiveMode = 'signup' | 'signin' | 'check' | 'forgot' | 'forgotSent';

/** Live build: a real account on UniBridge's servers, confirmed by email. */
function LiveAuth() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ mode?: string; email?: string }>();
  const account = useAuthStore((s) => s.account);
  const onboarded = useProfileStore((s) => s.onboarded);
  const pendingAccount = account?.live && account.pending ? account : null;
  const [mode, setMode] = useState<LiveMode>(
    params.mode === 'signin' ? 'signin'
      : params.mode === 'forgot' ? 'forgot'
        : pendingAccount ? 'check' : 'signup',
  );
  const [name, setName] = useState(pendingAccount?.name ?? '');
  const [email, setEmail] = useState(params.email ?? pendingAccount?.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notConfirmed, setNotConfirmed] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cleanEmail = email.trim().toLowerCase();
  // Typing again clears the last error, so a fixed field never looks wrong.
  const edit = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setError(null);
    setNotConfirmed(false);
  };

  const switchMode = (next: LiveMode) => {
    setMode(next);
    setError(null);
    setInfo(null);
    setNotConfirmed(false);
  };

  const fail = (e: unknown) => {
    const err = e instanceof AuthUiError ? e : new AuthUiError('generic', String((e as Error)?.message ?? e));
    setNotConfirmed(err.kind === 'not_confirmed');
    setInfo(null);
    setError(
      err.kind === 'invalid' ? t('auth.errInvalid')
        : err.kind === 'not_confirmed' ? t('auth.errNotConfirmed')
          : err.kind === 'exists' ? t('auth.errExists')
            : err.kind === 'rate_limit' ? t('auth.errRateLimit')
              : err.kind === 'network' ? t('auth.errNetwork')
                : t('auth.errGeneric', { message: err.message }),
    );
  };

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const enter = async (signedIn: Awaited<ReturnType<typeof currentUser>>) => {
    if (!signedIn) return;
    const dest = await completeSignIn(signedIn);
    hapticSuccess();
    const first = String((signedIn.user_metadata as { name?: string } | undefined)?.name ?? '').trim().split(' ')[0];
    toast(t('auth.signedIn', { name: first || cleanEmail.split('@')[0] }));
    router.replace(dest);
  };

  const doSignUp = () => {
    setError(null);
    if (!name.trim()) return setError(t('auth.nameRequired'));
    if (!EMAIL_RE.test(cleanEmail)) return setError(t('auth.emailInvalid'));
    if (password.length < 8) return setError(t('auth.passwordShort'));
    void run(async () => {
      const result = await signUp(name.trim(), cleanEmail, password);
      if (result === 'active') return enter(await currentUser());
      useAuthStore.getState().signIn({ name: name.trim(), email: cleanEmail, provider: 'email', live: true, pending: true });
      hapticSuccess();
      setPassword('');
      switchMode('check');
    });
  };

  const doSignIn = () => {
    setError(null);
    if (!EMAIL_RE.test(cleanEmail)) return setError(t('auth.emailInvalid'));
    if (!password) return setError(t('auth.passwordShort'));
    void run(async () => enter(await liveSignIn(cleanEmail, password)));
  };

  const doResend = () =>
    void run(async () => {
      await resendConfirmation(cleanEmail);
      setError(null);
      setInfo(t('auth.resent'));
    });

  const doForgot = () => {
    setError(null);
    if (!EMAIL_RE.test(cleanEmail)) return setError(t('auth.emailInvalid'));
    void run(async () => {
      await sendPasswordReset(cleanEmail);
      switchMode('forgotSent');
    });
  };

  const continueSetup = () => (onboarded ? router.replace('/(tabs)/profile') : router.push('/onboarding/profile'));

  const back = () => {
    if (mode === 'signup' || mode === 'signin') return goBack('/onboarding/welcome');
    switchMode(mode === 'check' ? 'signup' : 'signin');
  };

  const title = {
    signup: t('auth.title'), signin: t('auth.signInTitle'), check: t('auth.checkTitle'),
    forgot: t('auth.forgotTitle'), forgotSent: t('auth.checkTitle'),
  }[mode];
  const subtitle = {
    signup: t('auth.subtitle'),
    signin: t('auth.signInSubtitle'),
    check: t('auth.checkBody', { email: cleanEmail }),
    forgot: t('auth.forgotBody'),
    forgotSent: t('auth.forgotSent', { email: cleanEmail }),
  }[mode];

  const messages = (
    <>
      {error ? <Text variant="caption" tone="danger" testID="auth-error">{error}</Text> : null}
      {info ? <Text variant="caption" color={colors.eligible} testID="auth-info">{info}</Text> : null}
    </>
  );

  const emailField = (
    <TextField
      label={t('auth.emailLabel')}
      value={email}
      onChangeText={edit(setEmail)}
      keyboardType="email-address"
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="email"
      placeholder="you@email.com"
      testID="auth-email"
    />
  );

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={{ gap: spacing.xl, paddingTop: spacing.xl }}>
        <Row>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={back} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Pressable>
        </Row>

        {mode === 'check' || mode === 'forgotSent' ? (
          <View
            style={{
              width: 64, height: 64, borderRadius: radius.full, backgroundColor: colors.accentSoft,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name="mail-unread-outline" size={30} color={colors.accent} />
          </View>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <Text variant="title" testID="auth-title">{title}</Text>
          <Text variant="body" tone="secondary">{subtitle}</Text>
        </View>

        {mode === 'signup' || mode === 'signin' ? (
          <Row
            style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 4 }}
          >
            {(['signup', 'signin'] as const).map((m) => (
              <Pressable
                key={m}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === m }}
                onPress={() => switchMode(m)}
                testID={`auth-tab-${m}`}
                style={{
                  flex: 1, minHeight: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: mode === m ? colors.surface : 'transparent',
                }}
              >
                <Text variant="label" tone={mode === m ? 'primary' : 'faint'}>
                  {m === 'signup' ? t('auth.tabSignUp') : t('auth.tabSignIn')}
                </Text>
              </Pressable>
            ))}
          </Row>
        ) : null}

        {mode === 'signup' ? (
          <View style={{ gap: spacing.lg }}>
            <TextField
              label={t('onboarding.nameLabel')}
              value={name}
              onChangeText={edit(setName)}
              autoCapitalize="words"
              autoComplete="name"
              placeholder={t('onboarding.namePlaceholder')}
              testID="auth-name"
            />
            {emailField}
            <TextField
              label={t('auth.passwordLabel')}
              value={password}
              onChangeText={edit(setPassword)}
              secureTextEntry
              autoComplete="new-password"
              hint={t('auth.passwordHint')}
              testID="auth-password"
            />
            {messages}
            {error === t('auth.errExists') ? (
              <Button label={t('auth.tabSignIn')} variant="secondary" onPress={() => switchMode('signin')} testID="auth-goto-signin" />
            ) : null}
            <Button label={t('auth.continue')} size="lg" loading={busy} disabled={busy} onPress={doSignUp} testID="auth-submit" />
            <Text variant="caption" tone="faint" center>{t('auth.liveNote')}</Text>
          </View>
        ) : null}

        {mode === 'signin' ? (
          <View style={{ gap: spacing.lg }}>
            {emailField}
            <TextField
              label={t('auth.passwordLabel')}
              value={password}
              onChangeText={edit(setPassword)}
              secureTextEntry
              autoComplete="current-password"
              testID="auth-password"
            />
            <Pressable onPress={() => switchMode('forgot')} accessibilityRole="button" testID="auth-forgot" style={{ alignSelf: 'flex-start' }}>
              <Text variant="label" tone="accent">{t('auth.forgot')}</Text>
            </Pressable>
            {messages}
            {notConfirmed ? (
              <Button label={t('auth.resend')} variant="secondary" icon="mail-outline" loading={busy} disabled={busy} onPress={doResend} testID="auth-resend" />
            ) : null}
            <Button label={t('auth.signInCtaLive')} size="lg" loading={busy} disabled={busy} onPress={doSignIn} testID="auth-submit" />
          </View>
        ) : null}

        {mode === 'check' ? (
          <View style={{ gap: spacing.md }}>
            {messages}
            <Button label={t('auth.continueSetup')} size="lg" onPress={continueSetup} testID="auth-continue-setup" />
            <Button label={t('auth.resend')} variant="secondary" icon="mail-outline" loading={busy} disabled={busy} onPress={doResend} testID="auth-resend" />
            <Button label={t('auth.haveConfirmed')} variant="ghost" onPress={() => switchMode('signin')} testID="auth-have-confirmed" />
            <Button
              label={t('auth.useOtherEmail')}
              variant="ghost"
              onPress={() => {
                useAuthStore.getState().signOut();
                setEmail('');
                switchMode('signup');
              }}
            />
          </View>
        ) : null}

        {mode === 'forgot' ? (
          <View style={{ gap: spacing.lg }}>
            {emailField}
            {messages}
            <Button label={t('auth.forgotCta')} size="lg" loading={busy} disabled={busy} onPress={doForgot} testID="auth-forgot-submit" />
            <Button label={t('auth.backToSignIn')} variant="ghost" onPress={() => switchMode('signin')} />
          </View>
        ) : null}

        {mode === 'forgotSent' ? (
          <Button label={t('auth.backToSignIn')} size="lg" onPress={() => switchMode('signin')} testID="auth-back-signin" />
        ) : null}
      </View>
    </Screen>
  );
}

export default function AuthScreen() {
  return isBackendConfigured ? <LiveAuth /> : <DemoAuth />;
}

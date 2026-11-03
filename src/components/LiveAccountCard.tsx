import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Misc';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { AuthUiError, resendConfirmation, signOutLive } from '@/services/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/store/useToastStore';

/** Profile-tab account card for the live build: signed in, waiting for the
 * email link, or signed out. A prototype-era local account counts as
 * signed out here — it has no server account behind it. */
export function LiveAccountCard() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const account = useAuthStore((s) => s.account);
  const [busy, setBusy] = useState(false);
  const live = account?.live ? account : null;

  if (!live) {
    return (
      <Button
        label={t('auth.signInCta')}
        variant="secondary"
        icon="person-circle-outline"
        onPress={() => router.push('/onboarding/auth')}
        testID="account-signin"
      />
    );
  }

  if (live.pending) {
    const resend = async () => {
      setBusy(true);
      try {
        await resendConfirmation(live.email);
        toast(t('auth.resent'));
      } catch (e) {
        toast(e instanceof AuthUiError && e.kind === 'rate_limit' ? t('auth.errRateLimit') : t('auth.errNetwork'));
      } finally {
        setBusy(false);
      }
    };
    return (
      <Card style={{ gap: spacing.sm }}>
        <Row gap={spacing.md}>
          <Ionicons name="mail-unread-outline" size={18} color={colors.borderline} />
          <View style={{ flex: 1 }}>
            <Text variant="label">{t('auth.pendingTitle')}</Text>
            <Text variant="caption" tone="faint">{t('auth.pendingBody', { email: live.email })}</Text>
          </View>
        </Row>
        <Row gap={spacing.sm}>
          <Button label={t('auth.resend')} size="sm" variant="secondary" loading={busy} disabled={busy} onPress={() => void resend()} />
          <Button
            label={t('auth.tabSignIn')}
            size="sm"
            onPress={() => router.push(`/onboarding/auth?mode=signin&email=${encodeURIComponent(live.email)}`)}
          />
        </Row>
      </Card>
    );
  }

  return (
    <Card style={{ gap: spacing.sm }}>
      <Row gap={spacing.md}>
        <Ionicons name="mail-outline" size={18} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text variant="label" testID="account-email">{live.email}</Text>
          <Text variant="caption" tone="faint">
            {t('auth.provider_email')} · {t('auth.signedInLive')}
          </Text>
        </View>
        <Ionicons name="checkmark-circle" size={18} color={colors.eligible} />
      </Row>
      <Button
        label={t('auth.signOut')}
        variant="danger"
        size="sm"
        icon="log-out-outline"
        loading={busy}
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          await signOutLive();
          // Wipes this device's copy of the profile, then reopens Welcome.
          router.replace('/reset');
        }}
        style={{ alignSelf: 'flex-start' }}
        testID="account-signout"
      />
    </Card>
  );
}

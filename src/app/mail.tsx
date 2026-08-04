import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useTheme } from '@/hooks/useTheme';
import { getSupportBundle, listInstitutions } from '@/services/api';
import { useMailStore } from '@/store/useMailStore';
import type { MailKind } from '@/types/models';

const KIND_TONE: Record<MailKind, 'eligible' | 'borderline' | 'pathway' | 'accent' | 'neutral'> = {
  offer: 'eligible',
  conditional: 'borderline',
  document_request: 'borderline',
  interview: 'pathway',
  event: 'accent',
  newsletter: 'neutral',
};

/** Unified inbox of university mail for the student's applications. */
export default function MailScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const state = useAsync(async () => Promise.all([getSupportBundle(), listInstitutions()]), []);
  const readIds = useMailStore((s) => s.readIds);
  const markRead = useMailStore((s) => s.markRead);

  if (state.loading) {
    return (
      <Screen edges={['top', 'bottom']}>
        <SkeletonCards count={4} height={96} />
      </Screen>
    );
  }
  if (state.error || !state.data) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ErrorState onRetry={state.retry} />
      </Screen>
    );
  }

  const [bundle, institutions] = state.data;
  const mails = [...bundle.mails].sort((a, b) => b.date.localeCompare(a.date));
  const instName = (id: string) => institutions.find((i) => i.id === id)?.short ?? id;

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <Row style={{ paddingVertical: spacing.md, gap: spacing.md }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="title">{t('mail.title')}</Text>
          <Text variant="caption" tone="secondary">{t('mail.subtitle')}</Text>
        </View>
      </Row>

      <View style={{ gap: spacing.md, paddingBottom: spacing.xxxl }}>
        {mails.map((m) => {
          const unread = !m.read && !readIds.includes(m.id);
          return (
            <Card key={m.id} onPress={() => markRead(m.id)} style={{ gap: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row gap={spacing.sm} style={{ flex: 1 }}>
                  {unread ? (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} />
                  ) : null}
                  <Text variant="caption" tone="secondary">{instName(m.institutionId)} · {m.date}</Text>
                </Row>
                <Badge tone={KIND_TONE[m.kind]} label={t(`mail.kind_${m.kind}`)} />
              </Row>
              <Text variant="sub" style={unread ? undefined : { opacity: 0.75 }}>{m.subject}</Text>
              <Text variant="caption" tone="faint" numberOfLines={2}>{m.snippet}</Text>
            </Card>
          );
        })}
        <Text variant="caption" tone="faint" center>{t('mail.note')}</Text>
      </View>
    </Screen>
  );
}

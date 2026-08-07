import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { Row } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { fonts, radius, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useMatchData } from '@/hooks/useMatchData';
import { useTheme } from '@/hooks/useTheme';
import { getFlightFares, getSafety, listCityInfo, listInstitutions } from '@/services/api';
import { respond, respondWizard, type AssistantCtx, type QuickReply, type WizardState } from '@/services/assistant';
import { homeCurrencyFor } from '@/services/currency';
import { useAssistantLogStore } from '@/store/useAssistantLogStore';

interface Msg {
  id: string;
  mine: boolean;
  text: string;
  chips?: QuickReply[];
  /** ISO timestamp shown under the bubble; restored messages keep theirs. */
  at?: string;
}

/** "14:05" for today's messages, "6 Aug · 14:05" for older days. */
function stamp(iso: string): string {
  const d = new Date(iso);
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay ? hm : `${d.getDate()}/${d.getMonth() + 1} · ${hm}`;
}

export default function AssistantScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { matchData, profile, loading, error, retry } = useMatchData();
  const extras = useAsync(async () => Promise.all([listInstitutions(), listCityInfo(), getFlightFares(), getSafety()]), []);
  const [messages, setMessages] = useState<Msg[] | null>(null);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [wizard, setWizard] = useState<WizardState | null>(null);
  const listRef = useRef<FlatList>(null);
  const idRef = useRef(0);
  // Latest interview state for the delayed reply handler — a fast typer can
  // send the next answer before the previous reply's setWizard has rendered.
  const wizardRef = useRef<WizardState | null>(null);
  useEffect(() => {
    wizardRef.current = wizard;
  }, [wizard]);
  // Whether the previous reply was emotional support — an unmatched
  // follow-up then gets comfort, never the feature menu.
  const lastPersonalRef = useRef(false);

  const ctx: AssistantCtx | null = useMemo(() => {
    if (!matchData || !profile || !extras.data) return null;
    return {
      t: (key, opts) => t(key, opts) as unknown as string,
      profile,
      matchData,
      institutions: extras.data[0],
      cityInfo: extras.data[1],
      flights: extras.data[2],
      safety: extras.data[3],
      home: homeCurrencyFor(profile),
    };
  }, [matchData, profile, extras.data, t]);

  // Seed once ready: restore the student's saved conversation (each entry
  // keeps its date & time), then greet fresh on top.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!ctx || messages) return;
    const saved = useAssistantLogStore.getState().log.map((m) => ({
      id: `log-${m.id}`,
      mine: m.mine,
      text: m.text,
      at: m.at,
    }));
    setMessages([
      ...saved,
      {
        id: 'a-0',
        mine: false,
        text: t('assistant.greeting', { name: ctx.profile.name.split(' ')[0] }),
        chips: respond('', ctx, 'menu').chips,
      },
    ]);
  }, [ctx, messages, t]);
  /* eslint-enable react-hooks/set-state-in-effect */
  const seeded = messages;

  const send = (text: string, intent?: string) => {
    if (!ctx || !text.trim()) return;
    idRef.current += 1;
    const user: Msg = { id: `u-${idRef.current}`, mine: true, text: text.trim(), at: new Date().toISOString() };
    useAssistantLogStore.getState().append([{ id: user.id, mine: true, text: user.text }]);
    setMessages([...(seeded ?? []), user]);
    setDraft('');
    setThinking(true);
    setTimeout(() => {
      // Mid-interview answers route through the wizard: free-typed text or
      // the wizard's own chips. Any other explicit intent exits the interview.
      const wiz = wizardRef.current;
      const wizardTurn =
        wiz &&
        (intent === undefined || intent.startsWith('interest:') || intent.startsWith('wamt:') ||
          intent.startsWith('wpref:') || intent.startsWith('wgoal:'));
      const reply = wizardTurn
        ? respondWizard(text, intent, wiz!, ctx)
        : respond(text, { ...ctx, lastPersonal: lastPersonalRef.current }, intent);
      lastPersonalRef.current = Boolean(reply.personal);
      if (!wizardTurn && wiz && reply.wizard === undefined) setWizard(null);
      if (reply.wizard !== undefined) setWizard(reply.wizard);
      idRef.current += 1;
      useAssistantLogStore.getState().append([{ id: `a-${idRef.current}`, mine: false, text: reply.text }]);
      setMessages((prev) => [
        ...(prev ?? []),
        { id: `a-${idRef.current}`, mine: false, text: reply.text, chips: reply.chips, at: new Date().toISOString() },
      ]);
      setThinking(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    }, 550);
  };

  if (loading || extras.loading) {
    return (
      <Screen edges={['top', 'bottom']}>
        <SkeletonCards count={4} height={72} />
      </Screen>
    );
  }
  if (error || extras.error || !ctx) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ErrorState onRetry={() => { retry(); extras.retry(); }} />
      </Screen>
    );
  }

  const data = seeded ?? [];

  return (
    <Screen padded={false} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Row style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md }}>
          <View
            style={{
              width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.accentSoft,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name="sparkles" size={17} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Row gap={6}>
              <Text variant="heading">{t('assistant.title')}</Text>
              <Badge tone="accent" label={t('common.beta')} />
            </Row>
            <Text variant="caption" tone="faint">{t('assistant.tagline')}</Text>
          </View>
        </Row>

        <FlatList<Msg>
          ref={listRef}
          data={thinking ? [...data, { id: 'typing', mine: false, text: '…' } as Msg] : data}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => (
            <View style={{ gap: spacing.sm }}>
              <View
                style={{
                  alignSelf: item.mine ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                  backgroundColor: item.mine ? colors.accent : colors.surface,
                  borderWidth: item.mine ? 0 : 1,
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                  borderBottomRightRadius: item.mine ? 4 : radius.lg,
                  borderBottomLeftRadius: item.mine ? radius.lg : 4,
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.md,
                }}
              >
                <Text variant="body" color={item.mine ? colors.onAccent : colors.ink}>{item.text}</Text>
                {item.at ? (
                  <Text
                    variant="micro"
                    color={item.mine ? 'rgba(255,255,255,0.7)' : colors.inkFaint}
                    style={{ alignSelf: 'flex-end', marginTop: 3 }}
                  >
                    {stamp(item.at)}
                  </Text>
                ) : null}
              </View>
              {!item.mine && item.chips?.length ? (
                <Row wrap gap={spacing.sm} style={{ paddingRight: spacing.xl }}>
                  {item.chips.map((c) => (
                    <Chip
                      key={c.intent + c.label}
                      small
                      label={c.label}
                      onPress={() => (c.route ? router.push(c.route as Href) : send(c.send, c.intent))}
                    />
                  ))}
                </Row>
              ) : null}
            </View>
          )}
          ListFooterComponent={
            <Text variant="caption" tone="faint" center style={{ marginTop: spacing.lg }}>
              {t('assistant.disclaimer')}
            </Text>
          }
        />

        <Row style={{ padding: spacing.lg, gap: spacing.sm }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('assistant.placeholder')}
            placeholderTextColor={colors.inkFaint}
            onSubmitEditing={() => send(draft)}
            returnKeyType="send"
            style={{
              flex: 1, minHeight: 48, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border,
              backgroundColor: colors.surface, paddingHorizontal: spacing.lg,
              fontFamily: fonts.medium, fontSize: 16, color: colors.ink,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('assistant.placeholder')}
            onPress={() => send(draft)}
            style={({ pressed }) => ({
              width: 48, height: 48, borderRadius: radius.full, backgroundColor: colors.accent,
              alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons name="arrow-up" size={20} color={colors.onAccent} />
          </Pressable>
        </Row>
      </KeyboardAvoidingView>
    </Screen>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { Row } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { fonts, radius, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useTheme } from '@/hooks/useTheme';
import { getIntakeGroup, listGroupMessages } from '@/services/api';
import { useCommunityStore } from '@/store/useCommunityStore';
import { useProfileStore } from '@/store/useProfileStore';

export default function GroupChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const profile = useProfileStore((s) => s.profile);
  const localMessages = useCommunityStore((s) => s.localMessages[id] ?? []);
  const sendMessage = useCommunityStore((s) => s.sendMessage);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList>(null);

  const state = useAsync(async () => Promise.all([getIntakeGroup(id), listGroupMessages(id)]), [id]);

  const messages = useMemo(
    () => [...(state.data?.[1] ?? []), ...localMessages],
    [state.data, localMessages],
  );

  if (state.loading) {
    return (
      <Screen edges={['top', 'bottom']}>
        <SkeletonCards count={6} height={56} />
      </Screen>
    );
  }
  const group = state.data?.[0];
  if (state.error || !group) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ErrorState onRetry={state.retry} />
      </Screen>
    );
  }

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    sendMessage(id, text, profile?.name ?? t('community.you'));
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <Screen padded={false} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Row style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text variant="heading" numberOfLines={1}>{group.name}</Text>
            <Text variant="caption" tone="faint">{t('common.members', { count: group.members })}</Text>
          </View>
        </Row>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const mine = item.id.startsWith('local-');
            return (
              <Row gap={spacing.sm} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%', alignItems: 'flex-end' }}>
                {!mine ? (
                  <Image source={{ uri: item.avatar }} style={{ width: 28, height: 28, borderRadius: radius.full, backgroundColor: colors.surfaceAlt }} />
                ) : null}
                <View
                  style={{
                    backgroundColor: mine ? colors.accent : colors.surface,
                    borderWidth: mine ? 0 : 1,
                    borderColor: colors.border,
                    borderRadius: radius.lg,
                    borderBottomLeftRadius: mine ? radius.lg : 4,
                    borderBottomRightRadius: mine ? 4 : radius.lg,
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.md,
                    flexShrink: 1,
                  }}
                >
                  {!mine ? <Text variant="micro" tone="accent">{item.author.toUpperCase()}</Text> : null}
                  <Text variant="body" color={mine ? colors.onAccent : colors.ink}>{item.text}</Text>
                </View>
              </Row>
            );
          }}
        />

        <Row style={{ padding: spacing.lg, gap: spacing.sm }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('community.typeMessage')}
            placeholderTextColor={colors.inkFaint}
            onSubmitEditing={send}
            returnKeyType="send"
            style={{
              flex: 1, minHeight: 48, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border,
              backgroundColor: colors.surface, paddingHorizontal: spacing.lg,
              fontFamily: fonts.medium, fontSize: 16, color: colors.ink,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('community.typeMessage')}
            onPress={send}
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

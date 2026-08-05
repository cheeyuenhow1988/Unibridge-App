import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { goBack } from '@/services/nav';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, View } from 'react-native';
import { Row } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { FLAGS } from '@/constants/countries';
import { fonts, radius, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useTheme } from '@/hooks/useTheme';
import { listCoursemates } from '@/services/api';
import { toast } from '@/store/useToastStore';
import { useCommunityStore, type MateMessage } from '@/store/useCommunityStore';

const NO_MESSAGES: MateMessage[] = [];

/** 1:1 chat with a connected coursemate (prototype: canned replies). */
export default function MateChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const messages = useCommunityStore((s) => s.mateMessages[id] ?? NO_MESSAGES);
  const sendMateMessage = useCommunityStore((s) => s.sendMateMessage);
  const deleteMateChat = useCommunityStore((s) => s.deleteMateChat);
  const unfriend = useCommunityStore((s) => s.unfriend);
  const block = useCommunityStore((s) => s.block);
  const [draft, setDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const listRef = useRef<FlatList>(null);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const state = useAsync(() => listCoursemates(), []);
  const mate = state.data?.find((m) => m.id === id);

  if (state.loading) {
    return (
      <Screen edges={['top', 'bottom']}>
        <SkeletonCards count={4} height={60} />
      </Screen>
    );
  }
  if (state.error || !mate) {
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
    sendMateMessage(id, text, true);
    // Canned acknowledgement, rotating by history length.
    const replies = [t('community.reply1'), t('community.reply2'), t('community.reply3')];
    const reply = replies[messages.filter((m) => !m.mine).length % replies.length];
    if (replyTimer.current) clearTimeout(replyTimer.current);
    replyTimer.current = setTimeout(() => sendMateMessage(id, reply, false), 1300);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
  };

  // In-app sheet instead of Alert.alert — button alerts are a no-op on web.
  const menuAction = (act: 'delete' | 'unfriend' | 'block') => {
    setMenuOpen(false);
    if (act === 'delete') {
      deleteMateChat(id);
      toast(t('community.chatDeleted'));
    } else if (act === 'unfriend') {
      unfriend(id);
      toast(t('community.unfriended', { name: mate.name.split(' ')[0] }));
      goBack('/chats');
    } else {
      block(id);
      toast(t('community.blocked', { name: mate.name.split(' ')[0] }));
      goBack('/chats');
    }
  };

  return (
    <Screen padded={false} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Row style={{ padding: spacing.lg, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => goBack('/chats')} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Pressable>
          <Image source={{ uri: mate.avatar }} style={{ width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.surfaceAlt }} />
          <View style={{ flex: 1 }}>
            <Text variant="label">{mate.name}</Text>
            <Text variant="micro" tone="faint">{FLAGS[mate.homeCountry]} {mate.courseName}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t('community.chatMenu')} onPress={() => setMenuOpen(true)} hitSlop={10}>
            <Ionicons name="ellipsis-vertical" size={20} color={colors.inkSecondary} />
          </Pressable>
        </Row>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
              <Ionicons name="chatbubbles-outline" size={32} color={colors.inkFaint} />
              <Text variant="caption" tone="faint" center>{t('community.chatIntro', { name: mate.name.split(' ')[0] })}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={{
                alignSelf: item.mine ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                backgroundColor: item.mine ? colors.accent : colors.surface,
                borderWidth: item.mine ? 0 : 1,
                borderColor: colors.border,
                borderRadius: radius.lg,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              }}
            >
              <Text variant="caption" color={item.mine ? colors.onAccent : colors.ink}>{item.text}</Text>
            </View>
          )}
        />

        <Row style={{ padding: spacing.lg, gap: spacing.sm }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={send}
            placeholder={t('community.chatPlaceholder')}
            placeholderTextColor={colors.inkFaint}
            style={{
              flex: 1, minHeight: 44, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border,
              backgroundColor: colors.surface, paddingHorizontal: spacing.lg, color: colors.ink, fontFamily: fonts.regular,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('community.chatSend')}
            onPress={send}
            style={{
              width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.accent,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name="arrow-up" size={20} color={colors.onAccent} />
          </Pressable>
        </Row>
      </KeyboardAvoidingView>

      <Modal visible={menuOpen} animationType="fade" transparent onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={() => setMenuOpen(false)} />
        <View
          style={{
            backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
            padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.xs,
          }}
        >
          {([
            ['trash-outline', t('community.deleteChat'), 'delete', colors.ink],
            ['person-remove-outline', t('community.unfriend'), 'unfriend', colors.danger],
            ['hand-left-outline', t('community.block'), 'block', colors.danger],
          ] as const).map(([icon, label, act, color]) => (
            <Pressable
              key={act}
              accessibilityRole="button"
              onPress={() => menuAction(act)}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: spacing.md,
                paddingVertical: spacing.md, opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons name={icon} size={18} color={color} />
              <Text variant="bodyMedium" color={color}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </Modal>
    </Screen>
  );
}

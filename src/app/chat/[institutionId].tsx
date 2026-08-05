import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { goBack } from '@/services/nav';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { Row } from '@/components/ui/Misc';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { fonts, radius, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useTheme } from '@/hooks/useTheme';
import { getInstitution } from '@/services/api';

interface ChatMessage {
  id: string;
  text: string;
  mine: boolean;
}

export default function MockChat() {
  const { institutionId } = useLocalSearchParams<{ institutionId: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { data: institution } = useAsync(() => getInstitution(institutionId), [institutionId]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList>(null);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    setMessages((m) => [...m, { id: `m-${Date.now()}`, text, mine: true }]);
    setTimeout(() => {
      setMessages((m) => [...m, { id: `r-${Date.now()}`, text: t('chat.mockReply'), mine: false }]);
      listRef.current?.scrollToEnd({ animated: true });
    }, 900);
  };

  return (
    <Screen padded={false} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Row style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, justifyContent: 'space-between' }}>
          <Pressable accessibilityRole="button" onPress={() => goBack('/explore')} hitSlop={10}>
            <Ionicons name="chevron-down" size={24} color={colors.ink} />
          </Pressable>
          <Text variant="heading" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
            {t('chat.title', { name: institution?.name.split(' ')[0] ?? '…' })}
          </Text>
          <View style={{ width: 24 }} />
        </Row>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, flexGrow: 1 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View
              style={{
                alignSelf: item.mine ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
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
            </View>
          )}
        />

        <Row style={{ padding: spacing.lg, gap: spacing.sm }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('chat.placeholder')}
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
            accessibilityLabel={t('common.share')}
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

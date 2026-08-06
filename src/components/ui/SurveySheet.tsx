import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, TextInput, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Row } from '@/components/ui/Misc';
import { Text } from '@/components/ui/Text';
import { fonts, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useFeedbackStore } from '@/store/useFeedbackStore';
import { useRewardsStore } from '@/store/useRewardsStore';
import { toast } from '@/store/useToastStore';

export const SURVEY_COINS = 30;

const IMPROVE_TAGS = ['matches', 'schoolInfo', 'prices', 'design', 'speed', 'other'] as const;

interface Props {
  visible: boolean;
  surveyId: string;
  /** Question shown as the sheet title, already translated. */
  question: string;
  onClose: () => void;
}

/** Three-part micro survey (score, improve chips, optional note) that pays
 * Rewards coins — the mechanic from ANALYTICS.md, demo-local for now. */
export function SurveySheet({ visible, surveyId, question, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const submit = useFeedbackStore((s) => s.submit);
  const earn = useRewardsStore((s) => s.earn);
  const [score, setScore] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const close = () => {
    setScore(0);
    setTags([]);
    setNote('');
    onClose();
  };

  const send = () => {
    if (!score) return;
    submit(surveyId, { score, tags, note: note.trim() || undefined });
    earn('rule_survey', SURVEY_COINS);
    toast(t('survey.coinsToast', { coins: SURVEY_COINS }));
    close();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={close} />
      <View
        style={{
          backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
          padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg,
        }}
      >
        <View style={{ gap: 4 }}>
          <Row gap={spacing.sm}>
            <Ionicons name="chatbox-ellipses-outline" size={18} color={colors.accent} />
            <Text variant="label" tone="accent">{t('survey.title')}</Text>
          </Row>
          <Text variant="title">{question}</Text>
        </View>

        <Row gap={spacing.sm} style={{ justifyContent: 'center' }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={t('survey.starLabel', { n })}
              onPress={() => setScore(n)}
              hitSlop={6}
            >
              <Ionicons
                name={n <= score ? 'star' : 'star-outline'}
                size={34}
                color={n <= score ? colors.borderline : colors.inkFaint}
              />
            </Pressable>
          ))}
        </Row>

        <View style={{ gap: spacing.sm }}>
          <Text variant="label">{t('survey.improveLabel')}</Text>
          <Row gap={spacing.sm} wrap>
            {IMPROVE_TAGS.map((tag) => {
              const on = tags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => setTags((cur) => (on ? cur.filter((x) => x !== tag) : [...cur, tag]))}
                  style={{
                    borderRadius: radius.full, borderWidth: 1.5,
                    borderColor: on ? colors.accent : colors.border,
                    backgroundColor: on ? colors.accentSoft : colors.surface,
                    paddingHorizontal: spacing.md, minHeight: 34, justifyContent: 'center',
                  }}
                >
                  <Text variant="caption" tone={on ? 'accent' : 'secondary'}>{t(`survey.tag_${tag}`)}</Text>
                </Pressable>
              );
            })}
          </Row>
        </View>

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={t('survey.notePlaceholder')}
          placeholderTextColor={colors.inkFaint}
          style={{
            minHeight: 44, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border,
            backgroundColor: colors.surface, paddingHorizontal: spacing.lg, color: colors.ink,
            fontFamily: fonts.regular,
          }}
        />

        <View style={{ gap: spacing.sm }}>
          <Button
            label={t('survey.submit', { coins: SURVEY_COINS })}
            icon="paper-plane-outline"
            size="lg"
            disabled={!score}
            onPress={send}
          />
          <Button label={t('survey.skip')} variant="secondary" onPress={close} />
          <Text variant="caption" tone="faint" center>{t('survey.demoNote')}</Text>
        </View>
      </View>
    </Modal>
  );
}

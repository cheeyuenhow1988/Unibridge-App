import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '@/components/ui/Text';

export interface PickerOption<T extends string | number> {
  value: T;
  label: string;
  sublabel?: string;
  emoji?: string;
  /** Small accent pill next to the label, e.g. "Recommended". */
  tag?: string;
}

interface Props<T extends string | number> {
  label?: string;
  hint?: string;
  placeholder?: string;
  value: T | undefined;
  options: PickerOption<T>[];
  onChange: (value: T) => void;
}

export function PickerField<T extends string | number>({ label, hint, placeholder, value, options, onChange }: Props<T>) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  // Long lists (15 grading systems, 31 days…) overflow the sheet with no
  // visual cue — float a down button while more options remain below.
  const listRef = useRef<FlatList<PickerOption<T>>>(null);
  const [layoutH, setLayoutH] = useState(0);
  const [contentH, setContentH] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const moreBelow = contentH - scrollY - layoutH > 24;
  return (
    <View style={{ gap: spacing.xs + 2 }}>
      {label ? <Text variant="label">{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setScrollY(0);
          setOpen(true);
        }}
        style={({ pressed }) => ({
          minHeight: 50,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text
          variant="bodyMedium"
          tone={current ? 'primary' : 'faint'}
          style={{ fontFamily: fonts.medium, fontSize: 16, flex: 1 }}
          numberOfLines={1}
        >
          {current ? `${current.emoji ? `${current.emoji}  ` : ''}${current.label}` : placeholder ?? ''}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.inkFaint} />
      </Pressable>
      {hint ? <Text variant="caption" tone="faint">{hint}</Text> : null}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={() => setOpen(false)} />
        <SafeAreaView
          edges={['bottom']}
          style={{
            backgroundColor: colors.bg,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            maxHeight: '70%',
          }}
        >
          {/* minHeight: 0 lets the list shrink to the sheet's 70% cap so it
              scrolls internally instead of being clipped with no way down. */}
          <View style={{ padding: spacing.lg, gap: spacing.sm, flexShrink: 1, minHeight: 0 }}>
            {label ? <Text variant="heading">{label}</Text> : null}
            <FlatList
              ref={listRef}
              data={options}
              keyExtractor={(o) => String(o.value)}
              style={{ flexGrow: 0, flexShrink: 1, minHeight: 0 }}
              onLayout={(e) => setLayoutH(e.nativeEvent.layout.height)}
              onContentSizeChange={(_, h) => setContentH(h)}
              onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
              scrollEventThrottle={16}
              renderItem={({ item }) => {
                const selected = item.value === value;
                return (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                      paddingVertical: spacing.md + 2,
                      paddingHorizontal: spacing.sm,
                      borderRadius: radius.md,
                      backgroundColor: selected ? colors.accentSoft : pressed ? colors.surfaceAlt : 'transparent',
                    })}
                  >
                    {item.emoji ? <Text style={{ fontSize: 22 }}>{item.emoji}</Text> : null}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                        <Text variant="bodyMedium">{item.label}</Text>
                        {item.tag ? (
                          <View
                            style={{
                              paddingHorizontal: spacing.sm,
                              paddingVertical: 2,
                              borderRadius: radius.full,
                              backgroundColor: colors.accentSoft,
                            }}
                          >
                            <Text variant="micro" color={colors.accent}>{item.tag}</Text>
                          </View>
                        ) : null}
                      </View>
                      {item.sublabel ? <Text variant="caption" tone="faint">{item.sublabel}</Text> : null}
                    </View>
                    {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.accent} /> : null}
                  </Pressable>
                );
              }}
            />
            {moreBelow ? (
              <View
                pointerEvents="box-none"
                style={{ position: 'absolute', left: 0, right: 0, bottom: spacing.lg, alignItems: 'center' }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('common.moreBelow')}
                  onPress={() => listRef.current?.scrollToOffset({ offset: scrollY + layoutH * 0.75, animated: true })}
                  style={({ pressed }) => ({
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.85 : 1,
                    shadowColor: '#000',
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 3 },
                    elevation: 4,
                  })}
                >
                  <Ionicons name="chevron-down" size={20} color={colors.onAccent} />
                </Pressable>
              </View>
            ) : null}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

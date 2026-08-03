import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
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
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View style={{ gap: spacing.xs + 2 }}>
      {label ? <Text variant="label">{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
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
          <View style={{ padding: spacing.lg, gap: spacing.sm }}>
            {label ? <Text variant="heading">{label}</Text> : null}
            <FlatList
              data={options}
              keyExtractor={(o) => String(o.value)}
              style={{ flexGrow: 0 }}
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
                      <Text variant="bodyMedium">{item.label}</Text>
                      {item.sublabel ? <Text variant="caption" tone="faint">{item.sublabel}</Text> : null}
                    </View>
                    {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.accent} /> : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

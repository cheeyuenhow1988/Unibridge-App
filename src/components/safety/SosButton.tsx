import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { EmergencySheet, SAFETY_TEAL } from '@/components/safety/EmergencySheet';
import { Text } from '@/components/ui/Text';
import { radius } from '@/constants/theme';
import { useMatchData } from '@/hooks/useMatchData';
import { useApplicationsStore } from '@/store/useApplicationsStore';
import type { CountryCode } from '@/types/models';

/**
 * Persistent SOS floating button — appears on the main tabs once the student
 * has an application in flight. Small, calm, always one tap from help.
 */
export function SosButton() {
  const { t } = useTranslation();
  const applications = useApplicationsStore((s) => s.applications);
  const { matchData } = useMatchData();
  const [open, setOpen] = useState(false);

  if (applications.length === 0) return null;

  const first = applications[0];
  const result = matchData?.resultByCourseId.get(first.courseId);
  const destination = result
    ? { country: result.course.country as CountryCode, city: result.course.campusCity }
    : null;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('safety.sheetTitle')}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          position: 'absolute', right: 14, bottom: 92,
          alignItems: 'center', justifyContent: 'center', gap: 1,
          width: 52, height: 52, borderRadius: radius.full,
          backgroundColor: SAFETY_TEAL, opacity: pressed ? 0.88 : 1,
          shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
          elevation: 6,
        })}
      >
        <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
        <Text variant="micro" color="#FFFFFF" style={{ fontSize: 8, letterSpacing: 1 }}>
          {t('safety.sosLabel')}
        </Text>
      </Pressable>
      <EmergencySheet visible={open} destination={destination} onClose={() => setOpen(false)} />
    </>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Linking, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Misc';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useTheme } from '@/hooks/useTheme';
import { getSafety, getSupportBundle } from '@/services/api';
import { useProfileStore } from '@/store/useProfileStore';
import { toast } from '@/store/useToastStore';
import type { CountryCode, HomeCountryCode } from '@/types/models';

/** Steady, trustworthy teal — deliberately calm, never siren-red. */
export const SAFETY_TEAL = '#0E7490';
const TEAL_SOFT = 'rgba(14, 116, 144, 0.12)';

interface Props {
  visible: boolean;
  destination: { country: CountryCode; city: string } | null;
  onClose: () => void;
}

/**
 * The SOS sheet: team contacts, local emergency numbers, the student's
 * nearest home-country mission and a one-tap parent notify — all free tier.
 */
export function EmergencySheet({ visible, destination, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const profile = useProfileStore((s) => s.profile);
  const safety = useAsync(() => getSafety(), []);
  const support = useAsync(() => getSupportBundle(), []);

  const nationality = (profile?.nationality ?? 'MY') as HomeCountryCode;
  const lines = destination ? safety.data?.emergencyLines[destination.country] : undefined;
  const embassy = destination ? safety.data?.embassies[destination.country]?.[nationality] : undefined;
  const atHome = destination ? embassy === null : false;
  const team = (support.data?.team ?? []).filter((s) => s.role !== 'visa').slice(0, 2);
  const contact = profile?.emergencyContact;

  const lineRow = (label: string, number: string, icon: keyof typeof Ionicons.glyphMap) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      onPress={() => Linking.openURL(`tel:${number}`)}
      style={{
        flex: 1, alignItems: 'center', gap: 4, paddingVertical: spacing.md,
        backgroundColor: TEAL_SOFT, borderRadius: radius.lg,
      }}
    >
      <Ionicons name={icon} size={18} color={SAFETY_TEAL} />
      <Text variant="heading" color={SAFETY_TEAL}>{number}</Text>
      <Text variant="micro" tone="secondary">{label.toUpperCase()}</Text>
    </Pressable>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose} />
      <SafeAreaView
        edges={['bottom']}
        style={{
          backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '90%',
        }}
      >
        <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={spacing.sm}>
              <View
                style={{
                  width: 36, height: 36, borderRadius: radius.full, backgroundColor: TEAL_SOFT,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name="shield-checkmark" size={19} color={SAFETY_TEAL} />
              </View>
              <View>
                <Text variant="title">{t('safety.sheetTitle')}</Text>
                <Text variant="caption" tone="secondary">{t('safety.sheetSub')}</Text>
              </View>
            </Row>
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.inkSecondary} />
            </Pressable>
          </Row>

          <View style={{ gap: spacing.sm }}>
            <Text variant="label" tone="secondary">{t('safety.teamTitle')}</Text>
            {team.map((s) => (
              <Card key={s.id} style={{ gap: 2 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="label">{s.name}</Text>
                    <Text variant="caption" tone="faint">{t(`team.role_${s.role}`)}</Text>
                  </View>
                  <Row gap={spacing.md}>
                    <Pressable accessibilityRole="button" accessibilityLabel={`${t('team.call')} ${s.name}`} onPress={() => Linking.openURL(`tel:${s.phone.replace(/\s/g, '')}`)} hitSlop={8}>
                      <Ionicons name="call" size={20} color={SAFETY_TEAL} />
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={`${t('team.email')} ${s.name}`} onPress={() => Linking.openURL(`mailto:${s.email}`)} hitSlop={8}>
                      <Ionicons name="mail" size={20} color={SAFETY_TEAL} />
                    </Pressable>
                  </Row>
                </Row>
              </Card>
            ))}
          </View>

          {destination && lines ? (
            <View style={{ gap: spacing.sm }}>
              <Text variant="label" tone="secondary">
                {t('safety.localNumbers', { country: t(`countries.${destination.country}`) })}
              </Text>
              <Row gap={spacing.sm}>
                {lineRow(t('safety.police'), lines.police, 'shield-outline')}
                {lineRow(t('safety.ambulance'), lines.ambulance, 'medkit-outline')}
                {lineRow(t('safety.fire'), lines.fire, 'flame-outline')}
              </Row>
            </View>
          ) : null}

          {destination ? (
            <View style={{ gap: spacing.sm }}>
              <Text variant="label" tone="secondary">{t('safety.embassyTitle')}</Text>
              {atHome ? (
                <Card tone="alt">
                  <Text variant="caption" tone="secondary">{t('safety.embassyHome')}</Text>
                </Card>
              ) : embassy ? (
                <Card style={{ gap: 4 }}>
                  <Text variant="label">{embassy.name}</Text>
                  <Text variant="caption" tone="secondary">{embassy.address}, {embassy.city}</Text>
                  <Row gap={spacing.md} style={{ marginTop: 4 }}>
                    <Pressable accessibilityRole="button" onPress={() => Linking.openURL(`tel:${embassy.phone.replace(/\s/g, '')}`)}>
                      <Row gap={5}>
                        <Ionicons name="call-outline" size={14} color={SAFETY_TEAL} />
                        <Text variant="caption" color={SAFETY_TEAL}>{embassy.phone}</Text>
                      </Row>
                    </Pressable>
                    {embassy.afterHours ? (
                      <Pressable accessibilityRole="button" onPress={() => Linking.openURL(`tel:${embassy.afterHours?.replace(/\s/g, '')}`)}>
                        <Row gap={5}>
                          <Ionicons name="moon-outline" size={14} color={SAFETY_TEAL} />
                          <Text variant="caption" color={SAFETY_TEAL}>{t('safety.afterHours')}: {embassy.afterHours}</Text>
                        </Row>
                      </Pressable>
                    ) : null}
                  </Row>
                </Card>
              ) : null}
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (!contact) {
                onClose();
                router.push('/safety');
                return;
              }
              toast(t('safety.notifySent', { name: contact.name }));
            }}
            style={({ pressed }) => ({
              backgroundColor: SAFETY_TEAL, borderRadius: radius.lg, padding: spacing.lg,
              flexDirection: 'row', alignItems: 'center', gap: spacing.md, opacity: pressed ? 0.9 : 1,
            })}
          >
            <Ionicons name="heart-circle-outline" size={26} color="#FFFFFF" />
            <View style={{ flex: 1 }}>
              <Text variant="label" color="#FFFFFF">{t('safety.notifyParent')}</Text>
              <Text variant="caption" color="rgba(255,255,255,0.85)">
                {contact
                  ? t('safety.notifyParentSub', { name: contact.name, city: destination?.city ?? '—' })
                  : t('safety.noContact')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
          </Pressable>

          <Text variant="caption" tone="faint" center>{t('safety.verifyNote')}</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

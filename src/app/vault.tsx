import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { goBack } from '@/services/nav';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Misc';
import { PickerField } from '@/components/ui/PickerField';
import { Screen } from '@/components/ui/Screen';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/useAsync';
import { useTheme } from '@/hooks/useTheme';
import { getDocumentTypes, getQualificationSystems } from '@/services/api';
import { useProfileStore } from '@/store/useProfileStore';
import { toast } from '@/store/useToastStore';
import { useVaultStore } from '@/store/useVaultStore';
import type { DocumentTypeId } from '@/types/models';

/** Year/month/day picker row — no free-text dates, no silent failures. */
function ExpiryPicker({ label, value, onChange }: { label: string; value?: string; onChange: (date: string) => void }) {
  const [y, m, d] = (value ?? '--').split('-');
  const [year, setYear] = useState(y && y !== '' ? y : undefined);
  const [month, setMonth] = useState(m || undefined);
  const [day, setDay] = useState(d || undefined);

  const commit = (ny?: string, nm?: string, nd?: string) => {
    if (ny && nm && nd) onChange(`${ny}-${nm}-${nd}`);
  };
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <Row gap={spacing.sm} style={{ alignItems: 'flex-end' }}>
      <View style={{ flex: 3 }}>
        <PickerField
          label={label}
          placeholder="——"
          value={year}
          options={Array.from({ length: 9 }, (_, i) => String(2025 + i)).map((v) => ({ value: v, label: v }))}
          onChange={(v) => { setYear(v); commit(v, month, day); }}
        />
      </View>
      <View style={{ flex: 2 }}>
        <PickerField
          placeholder="——"
          value={month}
          options={Array.from({ length: 12 }, (_, i) => pad(i + 1)).map((v) => ({ value: v, label: v }))}
          onChange={(v) => { setMonth(v); commit(year, v, day); }}
        />
      </View>
      <View style={{ flex: 2 }}>
        <PickerField
          placeholder="——"
          value={day}
          options={Array.from({ length: 31 }, (_, i) => pad(i + 1)).map((v) => ({ value: v, label: v }))}
          onChange={(v) => { setDay(v); commit(year, month, v); }}
        />
      </View>
    </Row>
  );
}

const DOC_ICONS: Record<DocumentTypeId, keyof typeof Ionicons.glyphMap> = {
  transcript: 'school-outline',
  certificate: 'ribbon-outline',
  passport: 'globe-outline',
  english: 'language-outline',
  recommendation: 'mail-open-outline',
  statement: 'create-outline',
  financial: 'card-outline',
  portfolio: 'images-outline',
  health: 'medkit-outline',
};

type DocStatus = 'uploaded' | 'missing' | 'expiringSoon' | 'expired';

/** Not required for a first application — badge these "Optional", not "Missing". */
const OPTIONAL_DOCS: DocumentTypeId[] = ['recommendation', 'portfolio', 'health'];

export default function VaultScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const types = useAsync(getDocumentTypes);
  const systems = useAsync(getQualificationSystems);
  const documents = useVaultStore((s) => s.documents);
  const addDocument = useVaultStore((s) => s.addDocument);
  const removeDocument = useVaultStore((s) => s.removeDocument);
  const setExpiry = useVaultStore((s) => s.setExpiry);
  const profile = useProfileStore((s) => s.profile);

  const intakeYear = profile?.intakeYear ?? 2027;
  const intakeDate = new Date(`${intakeYear}-02-01`);
  const intakeLabel = `Feb ${intakeYear}`;

  const statusFor = (type: DocumentTypeId): { status: DocStatus; expiry?: string } => {
    const doc = documents.find((d) => d.type === type);
    if (!doc) return { status: 'missing' };
    if (doc.expiryDate) {
      const expiry = new Date(doc.expiryDate);
      const now = new Date();
      if (expiry < now) return { status: 'expired', expiry: doc.expiryDate };
      const soon = new Date(now);
      soon.setMonth(soon.getMonth() + 6);
      if (expiry < soon || expiry < intakeDate) return { status: 'expiringSoon', expiry: doc.expiryDate };
    }
    return { status: 'uploaded', expiry: doc.expiryDate };
  };

  const pick = async (type: DocumentTypeId, asImage: boolean) => {
    try {
      if (asImage) {
        const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
        const asset = res.assets?.[0];
        if (!res.canceled && asset) {
          addDocument({ type, name: asset.fileName ?? `${type}.jpg`, uri: asset.uri });
        }
      } else {
        const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
        const asset = res.assets?.[0];
        if (!res.canceled && asset) {
          addDocument({ type, name: asset.name, uri: asset.uri });
        }
      }
    } catch {
      Alert.alert(t('common.errorTitle'));
    }
  };

  const warnings = documents.filter((d) => d.expiryDate && new Date(d.expiryDate) < intakeDate);
  // Names the exact certificate to upload, e.g. "THPT GPA" for a Vietnamese student.
  const systemName = systems.data?.find((s) => s.id === profile?.qualification)?.name;

  if (types.loading) {
    return (
      <Screen edges={['top', 'bottom']}>
        <SkeletonCards count={5} height={90} />
      </Screen>
    );
  }
  if (types.error) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ErrorState onRetry={types.retry} />
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <Row style={{ justifyContent: 'space-between', paddingVertical: spacing.md }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => goBack('/profile')} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text variant="heading">{t('vault.title')}</Text>
        <View style={{ width: 24 }} />
      </Row>
      <Text variant="body" tone="secondary" style={{ marginBottom: spacing.lg }}>
        {t('vault.subtitle')}
      </Text>

      {warnings.map((d) => (
        <Card key={d.id} style={{ borderColor: colors.borderline, marginBottom: spacing.md }}>
          <Row gap={spacing.sm}>
            <Ionicons name="warning-outline" size={18} color={colors.borderline} />
            <Text variant="caption" color={colors.borderline} style={{ flex: 1 }}>
              {t('vault.expiryWarning', { doc: t(`docs.${d.type}`), intake: intakeLabel })}
            </Text>
          </Row>
        </Card>
      ))}

      <View style={{ gap: spacing.md }}>
        {(types.data ?? []).map(({ id: type, hasExpiry }) => {
          const doc = documents.find((d) => d.type === type);
          const { status } = statusFor(type);
          const tone = status === 'uploaded' ? 'eligible' : status === 'missing' ? 'neutral' : status === 'expiringSoon' ? 'borderline' : 'danger';
          return (
            <Card key={type} style={{ gap: spacing.sm }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row gap={spacing.md} style={{ flex: 1 }}>
                  <View
                    style={{
                      width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.accentSoft,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={DOC_ICONS[type]} size={19} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="label">{t(`docs.${type}`)}</Text>
                    {type === 'transcript' && !doc && systemName ? (
                      <Text variant="caption" tone="faint">
                        {t('vault.transcriptSystem', { system: systemName })}
                      </Text>
                    ) : null}
                    {type !== 'transcript' && !doc ? (
                      <Text variant="caption" tone="faint">{t(`docs.${type}Desc`)}</Text>
                    ) : null}
                    {doc ? (
                      <Text variant="caption" tone="faint" numberOfLines={1}>
                        {doc.name} · {t('vault.uploadedOn', { date: doc.uploadedAt.slice(0, 10) })}
                      </Text>
                    ) : null}
                    {doc?.expiryDate ? (
                      <Text variant="caption" tone="faint">{t('vault.expiresOn', { date: doc.expiryDate })}</Text>
                    ) : null}
                  </View>
                </Row>
                <Badge
                  tone={tone}
                  label={
                    status === 'missing' && OPTIONAL_DOCS.includes(type)
                      ? t('vault.optional')
                      : t(`vault.${status}`)
                  }
                />
              </Row>

              <Row gap={spacing.sm} wrap>
                <Button
                  label={doc ? t('vault.replace') : t('vault.pickDocument')}
                  variant="secondary"
                  size="sm"
                  icon="document-attach-outline"
                  onPress={() => void pick(type, false)}
                />
                <Button
                  label={t('vault.pickImage')}
                  variant="ghost"
                  size="sm"
                  icon="image-outline"
                  onPress={() => void pick(type, true)}
                />
                {doc ? (
                  <Button
                    label={t('common.delete')}
                    variant="ghost"
                    size="sm"
                    icon="trash-outline"
                    onPress={() =>
                      Alert.alert(t('vault.removeConfirm'), undefined, [
                        { text: t('common.cancel'), style: 'cancel' },
                        { text: t('common.delete'), style: 'destructive', onPress: () => removeDocument(doc.id) },
                      ])
                    }
                  />
                ) : null}
              </Row>

              {doc && hasExpiry ? (
                <ExpiryPicker
                  label={t('vault.expiryLabel')}
                  value={doc.expiryDate}
                  onChange={(date) => {
                    setExpiry(doc.id, date);
                    toast(t('vault.expirySaved'));
                  }}
                />
              ) : null}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

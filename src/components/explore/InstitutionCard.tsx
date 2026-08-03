import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Misc';
import { Text } from '@/components/ui/Text';
import { FLAGS } from '@/constants/countries';
import { spacing } from '@/constants/theme';
import type { Institution } from '@/types/models';

export function InstitutionCard({ institution }: { institution: Institution }) {
  const { t } = useTranslation();
  return (
    <Card padded={false} onPress={() => router.push(`/institution/${institution.id}`)}>
      <Image
        source={{ uri: institution.images[0] }}
        style={{ width: '100%', height: 140 }}
        contentFit="cover"
        transition={200}
      />
      <View style={{ padding: spacing.lg, gap: spacing.xs }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text variant="sub" style={{ flex: 1 }} numberOfLines={1}>{institution.name}</Text>
          {institution.verifiedPartner ? (
            <Badge tone="verified" icon="shield-checkmark" label={t('common.verifiedPartner')} />
          ) : null}
        </Row>
        <Text variant="caption" tone="secondary">
          {FLAGS[institution.country]}  {t('institution.cityCountry', { city: institution.city, country: t(`countries.${institution.country}`) })} · {t(`instTypes.${institution.type}`)}
        </Text>
        <Text variant="caption" tone="faint" numberOfLines={1}>{institution.tagline}</Text>
      </View>
    </Card>
  );
}

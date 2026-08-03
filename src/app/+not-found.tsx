import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/States';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <Screen edges={['top', 'bottom']} contentStyle={{ justifyContent: 'center' }}>
      <EmptyState
        icon="compass-outline"
        title={t('notFound.title')}
        body={t('notFound.body')}
        ctaLabel={t('notFound.cta')}
        onCta={() => router.replace('/(tabs)/match')}
      />
    </Screen>
  );
}

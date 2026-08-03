import { Redirect } from 'expo-router';
import { useProfileStore } from '@/store/useProfileStore';

export default function Index() {
  const onboarded = useProfileStore((s) => s.onboarded);
  return <Redirect href={onboarded ? '/(tabs)/match' : '/onboarding/welcome'} />;
}

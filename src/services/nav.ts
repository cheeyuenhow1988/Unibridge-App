import { router } from 'expo-router';

/** Back that always works: on a fresh page load (web refresh / deep link)
 * there is no history, so fall back to the screen's natural parent. */
export function goBack(fallback: string = '/match') {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback as never);
  }
}

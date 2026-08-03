import { Platform, Share } from 'react-native';
import { toast } from '@/store/useToastStore';

/**
 * Share text everywhere: native share sheet on iOS/Android, Web Share API
 * where available, clipboard + toast as the desktop fallback.
 */
export async function shareMessage(message: string, copiedLabel: string): Promise<void> {
  if (Platform.OS !== 'web') {
    await Share.share({ message });
    return;
  }
  const nav = navigator;
  if (nav.share) {
    try {
      await nav.share({ text: message });
      return;
    } catch {
      // fall through to clipboard (user cancelled or share failed)
    }
  }
  await nav.clipboard?.writeText(message);
  toast(copiedLabel);
}

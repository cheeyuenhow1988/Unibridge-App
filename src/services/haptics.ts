import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export function hapticTap(): void {
  if (Platform.OS !== 'web') void Haptics.selectionAsync();
}

export function hapticSuccess(): void {
  if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

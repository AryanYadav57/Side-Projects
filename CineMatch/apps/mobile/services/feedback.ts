import * as Haptics from 'expo-haptics';

export async function feedbackSelection(): Promise<void> {
  await Haptics.selectionAsync().catch(() => null);
}

export async function feedbackSuccess(): Promise<void> {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
}

export async function feedbackError(): Promise<void> {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => null);
}

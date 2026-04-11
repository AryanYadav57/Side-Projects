export const DAY3_ALARM = 'loom_day3_reminder';
export const WEEKLY_PRUNE_ALARM = 'loom_weekly_prune';

export async function scheduleDay3Reminder(installDate) {
  if (!installDate) return;
  const when = installDate + 3 * 24 * 60 * 60 * 1000;
  await chrome.alarms.create(DAY3_ALARM, { when });
}

export async function scheduleWeeklyPrune() {
  await chrome.alarms.create(WEEKLY_PRUNE_ALARM, {
    periodInMinutes: 60 * 24 * 7,
  });
}

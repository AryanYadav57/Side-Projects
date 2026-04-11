export const SETTINGS_KEY = 'loomSettings';
export const API_USAGE_KEY = 'loomApiUsage';

export const DEFAULT_EXCLUDES = [
  'chase.com',
  'bankofamerica.com',
  'wellsfargo.com',
  'paypal.com',
  'mychart.com',
  'webmd.com',
  'mayoclinic.org',
  'mail.google.com',
  'outlook.com',
  'localhost',
  '127.0.0.1',
  '192.168.',
  'accounts.google.com',
  'login.',
  'signin.',
  'auth.',
];

export const DEFAULT_SETTINGS = {
  minDwellTime: 30,
  dailyApiLimit: 200,
  nudgeSensitivity: 'medium',
  nudgeThreshold: 0.8,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  excludedDomains: DEFAULT_EXCLUDES,
  onboardingComplete: false,
  installDate: 0,
  day3NotificationSent: false,
  apiKey: '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',
};

function normalizeSettings(raw) {
  return {
    ...DEFAULT_SETTINGS,
    ...(raw && typeof raw === 'object' ? raw : {}),
    apiKey: typeof raw?.apiKey === 'string' && raw.apiKey.trim() ? raw.apiKey.trim() : DEFAULT_SETTINGS.apiKey,
  };
}

export async function getSettings() {
  const result = await chrome.storage.local.get([SETTINGS_KEY]);
  const normalized = normalizeSettings(result?.[SETTINGS_KEY]);

  if (!result?.[SETTINGS_KEY]?.apiKey?.trim()) {
    await chrome.storage.local.set({ [SETTINGS_KEY]: normalized });
  }

  return normalized;
}

export async function updateSettings(patch) {
  const current = await getSettings();
  const updated = normalizeSettings({ ...current, ...(patch || {}) });
  await chrome.storage.local.set({ [SETTINGS_KEY]: updated });
  return updated;
}

export function isExcludedDomain(urlOrDomain, settings) {
  if (!urlOrDomain || typeof urlOrDomain !== 'string') return true;

  const domain = urlOrDomain.includes('://') ? new URL(urlOrDomain).hostname : urlOrDomain;
  const excludes = settings?.excludedDomains || DEFAULT_EXCLUDES;
  const domainLower = domain.toLowerCase();
  return excludes.some((pattern) => domainLower.includes(pattern.toLowerCase()));
}

export function isWithinQuietHours(settings, nowDate = new Date()) {
  if (!settings?.quietHoursEnabled) return false;

  const [startH, startM] = (settings.quietHoursStart || '22:00').split(':').map(Number);
  const [endH, endM] = (settings.quietHoursEnd || '08:00').split(':').map(Number);

  const currentMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
  const startMinutes = (startH || 0) * 60 + (startM || 0);
  const endMinutes = (endH || 0) * 60 + (endM || 0);

  if (startMinutes === endMinutes) return true;
  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

export async function getDailyUsageCount(date = new Date()) {
  const dayKey = date.toISOString().slice(0, 10);
  const result = await chrome.storage.local.get([API_USAGE_KEY]);
  const usage = result?.[API_USAGE_KEY] || {};
  return { dayKey, count: usage[dayKey] || 0, usage };
}

export async function incrementDailyUsageCount() {
  const { dayKey, count, usage } = await getDailyUsageCount();
  const nextUsage = { ...usage, [dayKey]: count + 1 };
  await chrome.storage.local.set({ [API_USAGE_KEY]: nextUsage });
  return count + 1;
}

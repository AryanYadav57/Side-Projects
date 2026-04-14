import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_SEARCHES_KEY = 'search:recent:v1';
const MAX_RECENT_SEARCHES = 8;

export async function getRecentQueries(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export async function saveRecentQueries(queries: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(queries.slice(0, MAX_RECENT_SEARCHES))
    );
  } catch {
    // Search history should never block UI flows.
  }
}

export async function addRecentQuery(query: string): Promise<string[]> {
  const normalized = query.trim();
  if (!normalized) return getRecentQueries();

  const current = await getRecentQueries();
  const next = [
    normalized,
    ...current.filter((entry) => entry.toLowerCase() !== normalized.toLowerCase()),
  ].slice(0, MAX_RECENT_SEARCHES);

  await saveRecentQueries(next);
  return next;
}

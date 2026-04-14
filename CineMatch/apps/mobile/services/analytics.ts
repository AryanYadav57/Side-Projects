import AsyncStorage from '@react-native-async-storage/async-storage';

const EVENT_BUFFER_KEY = 'analytics:event-buffer:v1';
const MAX_BUFFER_SIZE = 250;

export type AnalyticsEventName =
  | 'app_open'
  | 'search_submit'
  | 'movie_open'
  | 'watchlist_add'
  | 'cinebot_message_sent'
  | 'trailer_tap'
  | 'movie_feedback'
  | 'experiment_assigned';

export interface AnalyticsEventMap {
  app_open: { source: 'startup' | 'resume' };
  search_submit: { query: string; genreCount: number; resultCount?: number };
  movie_open: { movieId: number; source: 'home' | 'search' | 'cinebot' | 'detail' };
  watchlist_add: { movieId: number; source: 'detail' | 'card' };
  cinebot_message_sent: { messageLength: number; fromQuickSuggestion: boolean };
  trailer_tap: { movieId: number; source: 'home' | 'detail' };
  movie_feedback: {
    movieId: number;
    action: 'not_interested' | 'more_like_this' | 'seen_already';
    source: 'detail' | 'cinebot';
  };
  experiment_assigned: {
    experiment: string;
    variant: string;
  };
}

export interface AnalyticsEvent<T extends AnalyticsEventName> {
  name: T;
  payload: AnalyticsEventMap[T];
  timestamp: string;
}

async function readBuffer(): Promise<Array<AnalyticsEvent<AnalyticsEventName>>> {
  try {
    const raw = await AsyncStorage.getItem(EVENT_BUFFER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeBuffer(events: Array<AnalyticsEvent<AnalyticsEventName>>): Promise<void> {
  try {
    await AsyncStorage.setItem(EVENT_BUFFER_KEY, JSON.stringify(events.slice(-MAX_BUFFER_SIZE)));
  } catch {
    // Keep analytics non-blocking.
  }
}

export async function trackEvent<T extends AnalyticsEventName>(
  name: T,
  payload: AnalyticsEventMap[T]
): Promise<void> {
  const event: AnalyticsEvent<T> = {
    name,
    payload,
    timestamp: new Date().toISOString(),
  };

  if (__DEV__) {
    console.log('[analytics]', event.name, event.payload);
  }

  const buffer = await readBuffer();
  await writeBuffer([...buffer, event as AnalyticsEvent<AnalyticsEventName>]);
}

export async function getTrackedEvents(): Promise<Array<AnalyticsEvent<AnalyticsEventName>>> {
  return readBuffer();
}

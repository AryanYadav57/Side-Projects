import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Movie, MovieTrailerHighlight } from './api';

const HOME_FEED_CACHE_KEY = 'cache:home-feed:v1';
const LAST_SEARCH_CACHE_KEY = 'cache:last-search:v1';

export interface HomeFeedCache {
  trending: Movie[];
  topRated: Movie[];
  bollywood: Movie[];
  trailerHighlight: MovieTrailerHighlight | null;
  cachedAt: string;
}

export interface SearchCache {
  query: string;
  genres: string[];
  results: Movie[];
  cachedAt: string;
}

async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep cache non-blocking.
  }
}

async function getItem<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setHomeFeedCache(payload: Omit<HomeFeedCache, 'cachedAt'>): Promise<void> {
  await setItem<HomeFeedCache>(HOME_FEED_CACHE_KEY, {
    ...payload,
    cachedAt: new Date().toISOString(),
  });
}

export async function getHomeFeedCache(): Promise<HomeFeedCache | null> {
  return getItem<HomeFeedCache>(HOME_FEED_CACHE_KEY);
}

export async function setLastSearchCache(payload: Omit<SearchCache, 'cachedAt'>): Promise<void> {
  await setItem<SearchCache>(LAST_SEARCH_CACHE_KEY, {
    ...payload,
    cachedAt: new Date().toISOString(),
  });
}

export async function getLastSearchCache(): Promise<SearchCache | null> {
  return getItem<SearchCache>(LAST_SEARCH_CACHE_KEY);
}

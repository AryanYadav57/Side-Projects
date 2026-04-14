import { create } from 'zustand';

import { watchlistApi } from '@/services/api';

interface WatchlistState {
  movieIds: number[];
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  isInWatchlist: (movieId: number) => boolean;
  addToWatchlist: (movieId: number) => Promise<boolean>;
  removeFromWatchlist: (movieId: number) => Promise<boolean>;
  toggleWatchlist: (movieId: number) => Promise<boolean>;
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  movieIds: [],
  hydrated: false,
  loading: false,
  error: null,

  hydrate: async () => {
    if (get().hydrated) return;
    await get().refresh();
    set({ hydrated: true });
  },

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const data = await watchlistApi.getWatchlist();
      set({ movieIds: data.watchlist, hydrated: true, loading: false });
    } catch (error) {
      set({
        loading: false,
        hydrated: true,
        error: error instanceof Error ? error.message : 'Unable to load watchlist',
      });
    }
  },

  isInWatchlist: (movieId: number) => get().movieIds.includes(movieId),

  addToWatchlist: async (movieId: number) => {
    try {
      const current = get().movieIds;
      if (current.includes(movieId)) return true;
      await watchlistApi.add(movieId);
      set({ movieIds: [movieId, ...current], error: null });
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add movie' });
      return false;
    }
  },

  removeFromWatchlist: async (movieId: number) => {
    try {
      await watchlistApi.remove(movieId);
      set({ movieIds: get().movieIds.filter((id) => id !== movieId), error: null });
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to remove movie' });
      return false;
    }
  },

  toggleWatchlist: async (movieId: number) => {
    if (get().movieIds.includes(movieId)) {
      return get().removeFromWatchlist(movieId);
    }
    return get().addToWatchlist(movieId);
  },
}));

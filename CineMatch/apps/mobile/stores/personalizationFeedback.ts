import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { Movie } from '@/services/api';

const FEEDBACK_KEY = 'personalization:feedback:v1';

type GenreBoostMap = Record<string, number>;

interface FeedbackPayload {
  notInterestedMovieIds: number[];
  seenMovieIds: number[];
  genreBoosts: GenreBoostMap;
  updatedAt: string;
}

interface PersonalizationFeedbackState extends FeedbackPayload {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  markNotInterested: (movie: Pick<Movie, 'id'>) => Promise<void>;
  markSeen: (movie: Pick<Movie, 'id'>) => Promise<void>;
  markMoreLike: (movie: Pick<Movie, 'id' | 'genres'>) => Promise<void>;
  isHiddenMovie: (movieId: number) => boolean;
  scoreMovie: (movie: Movie) => number;
}

const initialState: FeedbackPayload = {
  notInterestedMovieIds: [],
  seenMovieIds: [],
  genreBoosts: {},
  updatedAt: new Date(0).toISOString(),
};

async function persist(state: FeedbackPayload): Promise<void> {
  try {
    await AsyncStorage.setItem(FEEDBACK_KEY, JSON.stringify(state));
  } catch {
    // Keep personalization feedback non-blocking.
  }
}

export const usePersonalizationFeedbackStore = create<PersonalizationFeedbackState>((set, get) => ({
  ...initialState,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;

    try {
      const raw = await AsyncStorage.getItem(FEEDBACK_KEY);
      if (!raw) {
        set({ hydrated: true });
        return;
      }

      const parsed = JSON.parse(raw) as Partial<FeedbackPayload>;
      set({
        notInterestedMovieIds: Array.isArray(parsed.notInterestedMovieIds) ? parsed.notInterestedMovieIds : [],
        seenMovieIds: Array.isArray(parsed.seenMovieIds) ? parsed.seenMovieIds : [],
        genreBoosts: parsed.genreBoosts && typeof parsed.genreBoosts === 'object' ? parsed.genreBoosts : {},
        updatedAt: parsed.updatedAt || new Date().toISOString(),
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },

  markNotInterested: async (movie) => {
    const current = get();
    const nextPayload: FeedbackPayload = {
      notInterestedMovieIds: Array.from(new Set([movie.id, ...current.notInterestedMovieIds])),
      seenMovieIds: current.seenMovieIds,
      genreBoosts: current.genreBoosts,
      updatedAt: new Date().toISOString(),
    };
    set(nextPayload);
    await persist(nextPayload);
  },

  markSeen: async (movie) => {
    const current = get();
    const nextPayload: FeedbackPayload = {
      notInterestedMovieIds: current.notInterestedMovieIds,
      seenMovieIds: Array.from(new Set([movie.id, ...current.seenMovieIds])),
      genreBoosts: current.genreBoosts,
      updatedAt: new Date().toISOString(),
    };
    set(nextPayload);
    await persist(nextPayload);
  },

  markMoreLike: async (movie) => {
    const current = get();
    const boosts = { ...current.genreBoosts };
    movie.genres.forEach((genre) => {
      boosts[genre] = (boosts[genre] || 0) + 1;
    });

    const nextPayload: FeedbackPayload = {
      notInterestedMovieIds: current.notInterestedMovieIds,
      seenMovieIds: current.seenMovieIds,
      genreBoosts: boosts,
      updatedAt: new Date().toISOString(),
    };
    set(nextPayload);
    await persist(nextPayload);
  },

  isHiddenMovie: (movieId) => get().notInterestedMovieIds.includes(movieId),

  scoreMovie: (movie) => {
    const state = get();
    if (state.notInterestedMovieIds.includes(movie.id)) return -100;

    let score = 0;
    if (state.seenMovieIds.includes(movie.id)) score -= 10;

    movie.genres.forEach((genre) => {
      score += state.genreBoosts[genre] || 0;
    });

    return score;
  },
}));

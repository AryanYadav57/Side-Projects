/**
 * CineMatch API Service Layer
 * 
 * TMDB API client + app backend integration.
 * Uses TMDB directly from mobile for Phase 1 (backend integration in Phase 3+).
 */

import axios from 'axios';
import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';

const TMDB_API_KEY = '99b0ac237b92a54df3597e4058772d94';
const TMDB_BASE = 'https://api.tmdb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';
const CACHE_TTL_MS = 5 * 60 * 1000;

const memoryCache = new Map<string, { expiresAt: number; value: unknown }>();

function getCachedValue<T>(key: string): T | null {
  const cached = memoryCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return cached.value as T;
}

function setCachedValue<T>(key: string, value: T, ttlMs = CACHE_TTL_MS): T {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
  return value;
}

function resolveBackendBaseUrl(): string {
  const envBase = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (envBase) return envBase;

  // Most reliable in dev: infer host from the actual JS bundle URL.
  const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL as string | undefined;
  if (scriptURL) {
    const match = scriptURL.match(/https?:\/\/([^/:]+)(?::\d+)?/i);
    const host = match?.[1];
    if (host) {
      return `http://${host}:8000`;
    }
  }

  const hostUri =
    (Constants.expoConfig as any)?.hostUri ||
    (Constants as any)?.manifest?.debuggerHost ||
    '';

  const host = typeof hostUri === 'string' && hostUri.length > 0 ? hostUri.split(':')[0] : '';
  if (host) {
    if (Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1')) {
      return 'http://10.0.2.2:8000';
    }
    return `http://${host}:8000`;
  }

  return Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
}

function resolveBackendBaseCandidates(): string[] {
  const candidates: string[] = [];
  const envBase = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (envBase) candidates.push(envBase);

  const inferred = resolveBackendBaseUrl();
  if (inferred) candidates.push(inferred);

  const hostUri =
    (Constants.expoConfig as any)?.hostUri ||
    (Constants as any)?.manifest?.debuggerHost ||
    '';
  const host = typeof hostUri === 'string' && hostUri.length > 0 ? hostUri.split(':')[0] : '';
  if (host) candidates.push(`http://${host}:8000`);

  if (Platform.OS === 'android') {
    candidates.push('http://10.0.2.2:8000');
    candidates.push('http://localhost:8000');
  } else {
    candidates.push('http://localhost:8000');
  }

  return Array.from(new Set(candidates));
}

// ── Types ────────────────────────────────────────

export interface Movie {
  id: number;
  title: string;
  year: number;
  overview: string;
  poster_url: string | null;
  backdrop_url: string | null;
  vote_average: number;
  vote_count: number;
  genres: string[];
  language: string;
  match_score?: number;
}

export interface MovieDetail extends Movie {
  runtime: number | null;
  tagline: string;
  cast: CastMember[];
  director: string | null;
  platforms: StreamingPlatform[];
}

export interface CastMember {
  name: string;
  character: string;
  profile_url: string | null;
}

export interface StreamingPlatform {
  name: string;
  logo_url: string | null;
}

export interface CineBotRecommendation {
  title: string;
  year: number;
  genres: string[];
  imdb_rating: number;
  reason: string;
}

export interface CineBotChatResponse {
  reply: string;
  recommendations: CineBotRecommendation[];
}

export interface MovieTrailerHighlight {
  movie: Movie;
  trailerUrl: string;
}

export interface MovieTrailerInfo {
  trailerUrl: string;
  publishedAt: string | null;
  isNew: boolean;
}

export interface UserPreferencesPayload {
  genres: string[];
  languages: string[];
  platforms: string[];
  viewing_frequency?: string | null;
  preferred_runtime?: string | null;
  watching_with?: string | null;
}

export interface WatchlistResponse {
  watchlist: number[];
  count: number;
}

// ── Genre ID Map ─────────────────────────────────

const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
  53: 'Thriller', 10752: 'War', 37: 'Western',
};

const GENRE_NAME_TO_ID: Record<string, number> = Object.fromEntries(
  Object.entries(GENRE_MAP).map(([id, name]) => [name, Number(id)])
);

// ── Helpers ──────────────────────────────────────

function mapMovie(raw: any): Movie {
  return {
    id: raw.id,
    title: raw.title,
    year: raw.release_date ? new Date(raw.release_date).getFullYear() : 0,
    overview: raw.overview || '',
    poster_url: raw.poster_path ? `${TMDB_IMG}/w342${raw.poster_path}` : null,
    backdrop_url: raw.backdrop_path ? `${TMDB_IMG}/w780${raw.backdrop_path}` : null,
    vote_average: raw.vote_average || 0,
    vote_count: raw.vote_count || 0,
    genres: (raw.genre_ids || []).map((id: number) => GENRE_MAP[id]).filter(Boolean),
    language: raw.original_language || 'en',
  };
}

function mapMovieDetail(raw: any, credits: any, providers: any): MovieDetail {
  const cast: CastMember[] = (credits?.cast || []).slice(0, 10).map((c: any) => ({
    name: c.name,
    character: c.character,
    profile_url: c.profile_path ? `${TMDB_IMG}/w185${c.profile_path}` : null,
  }));

  const director = credits?.crew?.find((c: any) => c.job === 'Director')?.name || null;

  // Indian platform availability
  const inProviders = providers?.results?.IN?.flatrate || [];
  const platforms: StreamingPlatform[] = inProviders.map((p: any) => ({
    name: p.provider_name,
    logo_url: p.logo_path ? `${TMDB_IMG}/w92${p.logo_path}` : null,
  }));

  return {
    id: raw.id,
    title: raw.title,
    year: raw.release_date ? new Date(raw.release_date).getFullYear() : 0,
    overview: raw.overview || '',
    poster_url: raw.poster_path ? `${TMDB_IMG}/w500${raw.poster_path}` : null,
    backdrop_url: raw.backdrop_path ? `${TMDB_IMG}/w1280${raw.backdrop_path}` : null,
    vote_average: raw.vote_average || 0,
    vote_count: raw.vote_count || 0,
    genres: (raw.genres || []).map((g: any) => g.name),
    language: raw.original_language || 'en',
    runtime: raw.runtime || null,
    tagline: raw.tagline || '',
    cast,
    director,
    platforms,
  };
}

// ── TMDB API Client ──────────────────────────────

const tmdb = axios.create({
  baseURL: TMDB_BASE,
  params: { api_key: TMDB_API_KEY },
  timeout: 12000,
});

export const tmdbApi = {
  /** Get trending movies (this week) */
  async getTrending(page = 1): Promise<Movie[]> {
    const cacheKey = `tmdb:trending:${page}`;
    const cached = getCachedValue<Movie[]>(cacheKey);
    if (cached) return cached;

    const { data } = await tmdb.get('/trending/movie/week', {
      params: { page, region: 'IN' },
    });
    return setCachedValue(cacheKey, data.results.map(mapMovie), 2 * 60 * 1000);
  },

  /** Get top rated movies */
  async getTopRated(page = 1): Promise<Movie[]> {
    const cacheKey = `tmdb:top-rated:${page}`;
    const cached = getCachedValue<Movie[]>(cacheKey);
    if (cached) return cached;

    const { data } = await tmdb.get('/movie/top_rated', {
      params: { page, region: 'IN' },
    });
    return setCachedValue(cacheKey, data.results.map(mapMovie), 10 * 60 * 1000);
  },

  /** Get movies by language */
  async getByLanguage(lang: string, page = 1): Promise<Movie[]> {
    const cacheKey = `tmdb:language:${lang}:${page}`;
    const cached = getCachedValue<Movie[]>(cacheKey);
    if (cached) return cached;

    const { data } = await tmdb.get('/discover/movie', {
      params: {
        page,
        with_original_language: lang,
        sort_by: 'popularity.desc',
        'vote_count.gte': 50,
      },
    });
    return setCachedValue(cacheKey, data.results.map(mapMovie), 10 * 60 * 1000);
  },

  /** Search movies with optional filters */
  async search(query: string, filters?: { genres?: string[] }): Promise<Movie[]> {
    const normalizedQuery = query.trim().toLowerCase();
    const genreKey = (filters?.genres || []).slice().sort().join('|');
    const cacheKey = `tmdb:search:${normalizedQuery}:${genreKey}`;
    const cached = getCachedValue<Movie[]>(cacheKey);
    if (cached) return cached;

    if (query.trim()) {
      const { data } = await tmdb.get('/search/movie', {
        params: { query, page: 1, region: 'IN' },
      });
      let results = data.results.map(mapMovie);

      // Filter by genres if selected
      if (filters?.genres && filters.genres.length > 0) {
        results = results.filter((m: Movie) =>
          filters.genres!.some(g => m.genres.includes(g))
        );
      }
      return setCachedValue(cacheKey, results, 5 * 60 * 1000);
    } else if (filters?.genres && filters.genres.length > 0) {
      // Discover by genre
      const genreIds = filters.genres
        .map(g => GENRE_NAME_TO_ID[g])
        .filter(Boolean)
        .join(',');
      const { data } = await tmdb.get('/discover/movie', {
        params: {
          with_genres: genreIds,
          sort_by: 'popularity.desc',
          page: 1,
          'vote_count.gte': 50,
        },
      });
      return setCachedValue(cacheKey, data.results.map(mapMovie), 5 * 60 * 1000);
    }
    return [];
  },

  /** Get full movie details with credits and providers */
  async getMovieDetail(movieId: number): Promise<MovieDetail> {
    const cacheKey = `tmdb:detail:${movieId}`;
    const cached = getCachedValue<MovieDetail>(cacheKey);
    if (cached) return cached;

    const [movieResp, creditsResp, providersResp] = await Promise.all([
      tmdb.get(`/movie/${movieId}`),
      tmdb.get(`/movie/${movieId}/credits`),
      tmdb.get(`/movie/${movieId}/watch/providers`),
    ]);
    return setCachedValue(
      cacheKey,
      mapMovieDetail(movieResp.data, creditsResp.data, providersResp.data),
      15 * 60 * 1000
    );
  },

  /** Get similar movies for a title */
  async getSimilarMovies(movieId: number, page = 1): Promise<Movie[]> {
    const cacheKey = `tmdb:similar:${movieId}:${page}`;
    const cached = getCachedValue<Movie[]>(cacheKey);
    if (cached) return cached;

    const { data } = await tmdb.get(`/movie/${movieId}/similar`, {
      params: { page, region: 'IN' },
    });
    return setCachedValue(cacheKey, (data?.results || []).map(mapMovie), 10 * 60 * 1000);
  },

  /** Get popular movies from a genre name */
  async getByGenreName(genreName: string, page = 1): Promise<Movie[]> {
    const genreId = GENRE_NAME_TO_ID[genreName];
    if (!genreId) return [];

    const cacheKey = `tmdb:genre:${genreName}:${page}`;
    const cached = getCachedValue<Movie[]>(cacheKey);
    if (cached) return cached;

    const { data } = await tmdb.get('/discover/movie', {
      params: {
        page,
        with_genres: genreId,
        sort_by: 'popularity.desc',
        'vote_count.gte': 50,
        region: 'IN',
      },
    });
    return setCachedValue(cacheKey, (data?.results || []).map(mapMovie), 10 * 60 * 1000);
  },

  /** Get latest YouTube trailer info for a movie */
  async getMovieTrailer(movieId: number): Promise<MovieTrailerInfo | null> {
    const cacheKey = `tmdb:trailer:${movieId}`;
    const cached = getCachedValue<MovieTrailerInfo | null>(cacheKey);
    if (cached !== null) return cached;

    try {
      const { data } = await tmdb.get(`/movie/${movieId}/videos`);
      const trailers = (data?.results || [])
        .filter((video: any) => video?.site === 'YouTube' && video?.type === 'Trailer' && video?.key)
        .sort((a: any, b: any) => {
          const aTime = Date.parse(a?.published_at || '');
          const bTime = Date.parse(b?.published_at || '');
          return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
        });

      const picked = trailers[0];
      if (!picked?.key) return null;

      const publishedAt = typeof picked.published_at === 'string' ? picked.published_at : null;
      const publishedMs = publishedAt ? Date.parse(publishedAt) : Number.NaN;
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const isNew = !Number.isNaN(publishedMs) && Date.now() - publishedMs <= thirtyDaysMs;

      return setCachedValue(cacheKey, {
        trailerUrl: `https://www.youtube.com/watch?v=${picked.key}`,
        publishedAt,
        isNew,
      }, 30 * 60 * 1000);
    } catch {
      return setCachedValue(cacheKey, null, 60 * 1000);
    }
  },

  /** Get movies by mood (mapped to genres) */
  async getByMood(mood: string, page = 1): Promise<Movie[]> {
    const moodGenreMap: Record<string, string> = {
      laugh: '35',       // Comedy
      cry: '18',         // Drama
      thrill: '53,27',   // Thriller, Horror
      relax: '10751,35', // Family, Comedy
      think: '878,9648', // Sci-Fi, Mystery
    };
    const genreIds = moodGenreMap[mood] || '35';
    const { data } = await tmdb.get('/discover/movie', {
      params: {
        with_genres: genreIds,
        sort_by: 'vote_average.desc',
        'vote_count.gte': 100,
        page,
      },
    });
    return data.results.slice(0, 5).map(mapMovie);
  },

  /** Get a currently playing movie with the newest YouTube trailer available */
  async getNewTrailerHighlight(): Promise<MovieTrailerHighlight | null> {
    const cacheKey = 'tmdb:new-trailer-highlight';
    const cached = getCachedValue<MovieTrailerHighlight | null>(cacheKey);
    if (cached !== null) return cached;

    const { data } = await tmdb.get('/movie/now_playing', {
      params: { page: 1, region: 'IN' },
    });

    const candidates = (data?.results || []).slice(0, 12);

    for (const raw of candidates) {
      try {
        const { data: videosData } = await tmdb.get(`/movie/${raw.id}/videos`);
        const trailers = (videosData?.results || [])
          .filter((video: any) => video?.site === 'YouTube' && video?.type === 'Trailer' && video?.key)
          .sort((a: any, b: any) => {
            const aTime = Date.parse(a?.published_at || '');
            const bTime = Date.parse(b?.published_at || '');
            return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
          });

        const picked = trailers[0];
        if (!picked?.key) continue;

        return setCachedValue(cacheKey, {
          movie: mapMovie(raw),
          trailerUrl: `https://www.youtube.com/watch?v=${picked.key}`,
        }, 10 * 60 * 1000);
      } catch {
        // Try the next movie if one video's endpoint fails.
      }
    }
    return setCachedValue(cacheKey, null, 60 * 1000);
  },
};

export const cinebotApi = {
  async chat(payload: {
    message: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    user_preferences?: Record<string, unknown>;
  }): Promise<CineBotChatResponse> {
    const candidates = resolveBackendBaseCandidates();
    let lastError: unknown;

    for (const base of candidates) {
      try {
        const { data } = await axios.post(
          `${base}/api/cinebot/chat`,
          {
            message: payload.message,
            history: payload.history || [],
            user_preferences: payload.user_preferences || null,
          },
          { timeout: 15000 }
        );
        return {
          reply: data?.reply || '',
          recommendations: Array.isArray(data?.recommendations) ? data.recommendations : [],
        };
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Failed to reach CineBot backend');
  },
};

export const backendApi = {
  async healthCheck(): Promise<{ healthy: boolean; baseUrl?: string }> {
    const candidates = resolveBackendBaseCandidates();

    for (const base of candidates) {
      try {
        const { data } = await axios.get(`${base}/api/health`, { timeout: 5000 });
        if (data?.status === 'healthy') {
          return { healthy: true, baseUrl: base };
        }
      } catch {
        // Try next candidate URL.
      }
    }

    return { healthy: false };
  },
};

export const usersApi = {
  async savePreferences(payload: UserPreferencesPayload): Promise<{ status: string }> {
    const candidates = resolveBackendBaseCandidates();
    let lastError: unknown;

    for (const base of candidates) {
      try {
        const { data } = await axios.post(`${base}/api/users/preferences`, payload, {
          timeout: 10000,
        });
        return { status: data?.status || 'saved' };
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Failed to save user preferences');
  },
};

export const watchlistApi = {
  async getWatchlist(): Promise<WatchlistResponse> {
    const candidates = resolveBackendBaseCandidates();
    let lastError: unknown;

    for (const base of candidates) {
      try {
        const { data } = await axios.get(`${base}/api/watchlist/`, { timeout: 10000 });
        return {
          watchlist: Array.isArray(data?.watchlist) ? data.watchlist : [],
          count: typeof data?.count === 'number' ? data.count : 0,
        };
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Failed to fetch watchlist');
  },

  async add(movieId: number): Promise<{ status: string; count: number }> {
    const candidates = resolveBackendBaseCandidates();
    let lastError: unknown;

    for (const base of candidates) {
      try {
        const { data } = await axios.post(`${base}/api/watchlist/${movieId}`, null, {
          timeout: 10000,
        });
        return {
          status: data?.status || 'added',
          count: typeof data?.count === 'number' ? data.count : 0,
        };
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Failed to add watchlist movie');
  },

  async remove(movieId: number): Promise<{ status: string; count: number }> {
    const candidates = resolveBackendBaseCandidates();
    let lastError: unknown;

    for (const base of candidates) {
      try {
        const { data } = await axios.delete(`${base}/api/watchlist/${movieId}`, {
          timeout: 10000,
        });
        return {
          status: data?.status || 'removed',
          count: typeof data?.count === 'number' ? data.count : 0,
        };
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 404) {
          return { status: 'missing', count: 0 };
        }
        lastError = error;
      }
    }

    throw lastError || new Error('Failed to remove watchlist movie');
  },
};

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Dimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';

import { Colors, Spacing, BorderRadius } from '@/theme';
import { tmdbApi, type Movie } from '@/services/api';
import { trackEvent } from '@/services/analytics';
import { getLastSearchCache, setLastSearchCache } from '@/services/cache';
import { addRecentQuery, getRecentQueries } from '@/services/searchHistory';
import { feedbackSelection, feedbackSuccess } from '@/services/feedback';
import { useWatchlistStore } from '@/stores/watchlist';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.base * 2 - Spacing.md) / 2;

const GENRES = [
  'Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance',
  'Thriller', 'Animation', 'Documentary', 'Mystery', 'Fantasy', 'Crime',
];

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j += 1) dp[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  return dp[a.length][b.length];
}

function getDidYouMean(query: string, candidates: string[]): string | null {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery || normalizedQuery.length < 3) return null;

  let best: { candidate: string; score: number } | null = null;
  for (const candidate of candidates) {
    const normalizedCandidate = candidate.toLowerCase();
    if (!normalizedCandidate) continue;
    const score = levenshtein(normalizedQuery, normalizedCandidate);
    if (!best || score < best.score) {
      best = { candidate, score };
    }
  }

  if (!best) return null;
  const threshold = Math.max(2, Math.floor(normalizedQuery.length * 0.35));
  if (best.score > threshold) return null;
  if (best.candidate.toLowerCase() === normalizedQuery) return null;
  return best.candidate;
}

function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
    >
      <Ionicons name={icon} size={20} color={Colors.textSecondary} />
    </Pressable>
  );
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [searched, setSearched] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [trendingQueries, setTrendingQueries] = useState<string[]>([]);
  const [recentOnly, setRecentOnly] = useState(false);
  const [highRatedOnly, setHighRatedOnly] = useState(false);
  const requestVersion = useRef(0);
  const watchlistIds = useWatchlistStore((state) => state.movieIds);
  const addToWatchlist = useWatchlistStore((state) => state.addToWatchlist);
  const removeFromWatchlist = useWatchlistStore((state) => state.removeFromWatchlist);

  const suggestionQueries = useMemo(
    () => Array.from(new Set([...recentQueries, ...trendingQueries])),
    [recentQueries, trendingQueries]
  );

  const applyResultFilters = useCallback((items: Movie[]): Movie[] => {
    const currentYear = new Date().getFullYear();
    return items.filter((movie) => {
      if (recentOnly && movie.year < currentYear - 2) return false;
      if (highRatedOnly && movie.vote_average < 7) return false;
      return true;
    });
  }, [highRatedOnly, recentOnly]);

  useEffect(() => {
    void getRecentQueries().then((queries) => {
      setRecentQueries(queries);
    });

    void tmdbApi.getTrending().then((movies) => {
      const next = Array.from(new Set(movies.map((movie) => movie.title))).slice(0, 8);
      setTrendingQueries(next);
    }).catch(() => {
      setTrendingQueries([]);
    });
  }, []);

  const performSearch = useCallback(async (
    rawQuery: string,
    source: 'live' | 'submit' | 'suggestion' = 'submit'
  ) => {
    const normalizedQuery = rawQuery.trim();
    if (!normalizedQuery && selectedGenres.length === 0) {
      setResults([]);
      setSearched(false);
      setDidYouMean(null);
      return;
    }

    const currentRequest = ++requestVersion.current;
    setLoading(true);
    setSearched(true);
    try {
      const data = await tmdbApi.search(normalizedQuery, { genres: selectedGenres });
      if (currentRequest !== requestVersion.current) return;

      const filtered = applyResultFilters(data);
      setResults(filtered);
      setNotice(null);

      await setLastSearchCache({
        query: normalizedQuery,
        genres: selectedGenres,
        results: filtered,
      });

      if (source !== 'live') {
        void trackEvent('search_submit', {
          query: normalizedQuery,
          genreCount: selectedGenres.length,
          resultCount: filtered.length,
        });
        const updatedRecent = await addRecentQuery(normalizedQuery);
        setRecentQueries(updatedRecent);
      }

      if (filtered.length === 0) {
        setDidYouMean(getDidYouMean(normalizedQuery, suggestionQueries));
      } else {
        setDidYouMean(null);
      }
    } catch (error) {
      if (currentRequest !== requestVersion.current) return;
      console.error('Search failed:', error);

      const cached = await getLastSearchCache();
      if (cached) {
        setResults(cached.results);
        setNotice('Showing your last search results while connection recovers.');
      } else {
        setNotice('Search is unavailable right now. Please try again.');
      }
    } finally {
      if (currentRequest === requestVersion.current) {
        setLoading(false);
      }
    }
  }, [applyResultFilters, selectedGenres, suggestionQueries]);

  useEffect(() => {
    if (!query.trim() && selectedGenres.length === 0) {
      setResults([]);
      setSearched(false);
      setDidYouMean(null);
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      void performSearch(query, 'live');
    }, 300);

    return () => clearTimeout(timer);
  }, [query, selectedGenres, recentOnly, highRatedOnly, performSearch]);

  const handleSearch = useCallback(async () => {
    await performSearch(query, 'submit');
  }, [performSearch, query]);

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const toggleWatchlist = async (movie: Movie) => {
    await feedbackSelection();
    if (watchlistIds.includes(movie.id)) {
      await removeFromWatchlist(movie.id);
      return;
    }
    const added = await addToWatchlist(movie.id);
    if (added) {
      await feedbackSuccess();
      void trackEvent('watchlist_add', { movieId: movie.id, source: 'card' });
    }
  };

  const resetSearchFilters = () => {
    setSelectedGenres([]);
    setRecentOnly(false);
    setHighRatedOnly(false);
  };

  const runSuggestionSearch = (text: string) => {
    setQuery(text);
    void performSearch(text, 'suggestion');
  };

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.backdrop}>
        <LinearGradient colors={[Colors.primaryMuted, 'transparent']} style={styles.backdropTop} />
      </View>

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}> 
        <IconButton icon="sparkles-outline" label="Open CineBot" onPress={() => router.push('/cinebot')} />
        <IconButton
          icon="close"
          label="Clear search"
          onPress={() => {
            setQuery('');
            setResults([]);
            setSearched(false);
            setDidYouMean(null);
            resetSearchFilters();
          }}
        />
      </View>

      <View style={styles.titleWrap}>
        <Text style={styles.title}>Search</Text>
        <Text style={styles.subtitle}>Find your next movie night pick</Text>
      </View>

      <FlatList
        data={results}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={{ paddingBottom: insets.bottom + 104 }}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => String(item.id)}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={
          <>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={Colors.textTertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search movies, actors, directors..."
                placeholderTextColor={Colors.textTertiary}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <Pressable
                  onPress={() => { setQuery(''); setResults([]); setSearched(false); }}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search text"
                >
                  <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
                </Pressable>
              )}
              <Pressable
                onPress={handleSearch}
                style={({ pressed }) => [styles.searchAction, pressed && styles.searchActionPressed]}
                accessibilityRole="button"
                accessibilityLabel="Submit search"
              >
                <Ionicons name="arrow-forward" size={14} color={Colors.textInverse} />
              </Pressable>
            </View>

            {(recentQueries.length > 0 || trendingQueries.length > 0) && (
              <View style={styles.suggestionsBlock}>
                {recentQueries.length > 0 && (
                  <>
                    <Text style={styles.suggestionsLabel}>Recent</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsRow}>
                      {recentQueries.map((entry) => (
                        <Pressable key={`recent-${entry}`} style={styles.suggestionChip} onPress={() => runSuggestionSearch(entry)}>
                          <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
                          <Text style={styles.suggestionChipText}>{entry}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </>
                )}

                {trendingQueries.length > 0 && (
                  <>
                    <Text style={[styles.suggestionsLabel, styles.trendingLabel]}>Trending</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsRow}>
                      {trendingQueries.map((entry) => (
                        <Pressable key={`trending-${entry}`} style={styles.suggestionChip} onPress={() => runSuggestionSearch(entry)}>
                          <Ionicons name="trending-up-outline" size={12} color={Colors.rosePink} />
                          <Text style={styles.suggestionChipText}>{entry}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </>
                )}
              </View>
            )}

            <View style={styles.chipsHeaderRow}>
              <Text style={styles.chipsTitle}>Genres</Text>
              <View style={styles.chipsRightRow}>
                <Text style={styles.chipsCount}>{selectedGenres.length} selected</Text>
                {(selectedGenres.length > 0 || recentOnly || highRatedOnly) && (
                  <Pressable onPress={resetSearchFilters}>
                    <Text style={styles.resetText}>Reset</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {notice && (
              <View style={styles.noticeBar}>
                <Ionicons name="cloud-offline-outline" size={14} color={Colors.warning} />
                <Text style={styles.noticeText}>{notice}</Text>
              </View>
            )}

            <View style={styles.chipsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsList}>
                {GENRES.map(genre => (
                  <Pressable
                    key={genre}
                    style={({ pressed }) => [
                      styles.chip,
                      selectedGenres.includes(genre) && styles.chipSelected,
                      pressed && styles.chipPressed,
                    ]}
                    onPress={() => toggleGenre(genre)}
                  >
                    <Text style={[
                      styles.chipText,
                      selectedGenres.includes(genre) && styles.chipTextSelected,
                    ]}>
                      {genre}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.quickFilterRow}>
              <Pressable
                style={[styles.quickFilterChip, recentOnly && styles.quickFilterChipActive]}
                onPress={() => setRecentOnly((prev) => !prev)}
              >
                <Text style={[styles.quickFilterChipText, recentOnly && styles.quickFilterChipTextActive]}>Recent Releases</Text>
              </Pressable>
              <Pressable
                style={[styles.quickFilterChip, highRatedOnly && styles.quickFilterChipActive]}
                onPress={() => setHighRatedOnly((prev) => !prev)}
              >
                <Text style={[styles.quickFilterChipText, highRatedOnly && styles.quickFilterChipTextActive]}>Highly Rated</Text>
              </Pressable>
            </View>

            {!searched && results.length === 0 && (
              <Animated.View entering={FadeInDown.delay(160)} style={styles.exploreContainer}>
                <Ionicons name="compass-outline" size={24} color={Colors.rosePink} />
                <Text style={styles.exploreTitle}>Discover by mood or genre</Text>
                <Text style={styles.exploreSubtitle}>Pick one or more genres, then search for titles you love.</Text>
              </Animated.View>
            )}

            {loading && (
              <Animated.View entering={FadeIn} style={styles.loadingWrap}>
                <Text style={styles.loadingText}>Finding great matches...</Text>
                <View style={styles.loadingSkeletonGrid}>
                  <View style={styles.loadingSkeletonCard} />
                  <View style={styles.loadingSkeletonCard} />
                </View>
              </Animated.View>
            )}

            {searched && results.length === 0 && !loading && (
              <Animated.View entering={FadeIn} style={styles.emptyState}>
                <Ionicons name="film-outline" size={64} color={Colors.textTertiary} />
                <Text style={styles.emptyTitle}>No movies found</Text>
                <Text style={styles.emptySubtitle}>Try different keywords or filters</Text>
                <View style={styles.emptyActionsRow}>
                  <Pressable style={styles.emptyActionButton} onPress={() => runSuggestionSearch(trendingQueries[0] || 'Inception')}>
                    <Text style={styles.emptyActionText}>Try trending search</Text>
                  </Pressable>
                  <Pressable style={styles.emptyActionButton} onPress={() => router.push('/cinebot')}>
                    <Text style={styles.emptyActionText}>Ask CineBot</Text>
                  </Pressable>
                </View>
                {didYouMean && (
                  <Pressable style={styles.didYouMeanButton} onPress={() => runSuggestionSearch(didYouMean)}>
                    <Text style={styles.didYouMeanText}>Did you mean {didYouMean}?</Text>
                  </Pressable>
                )}
              </Animated.View>
            )}
          </>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInUp.delay(index * 60).springify()}>
            <Pressable
              style={({ pressed }) => [
                styles.resultCard,
                pressed && { transform: [{ scale: 0.96 }] },
              ]}
              onPress={() => {
                void trackEvent('movie_open', { movieId: item.id, source: 'search' });
                router.push(`/movie/${item.id}`);
              }}
            >
              <Image
                source={item.poster_url ? { uri: item.poster_url } : require('../../assets/images/icon.png')}
                style={styles.resultPoster}
                contentFit="cover"
                transition={300}
              />
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  void toggleWatchlist(item);
                }}
                style={({ pressed }) => [styles.bookmarkButton, pressed && styles.bookmarkButtonPressed]}
                accessibilityRole="button"
                accessibilityLabel={watchlistIds.includes(item.id) ? `Remove ${item.title} from watchlist` : `Save ${item.title} to watchlist`}
              >
                <Ionicons
                  name={watchlistIds.includes(item.id) ? 'bookmark' : 'bookmark-outline'}
                  size={15}
                  color={Colors.textPrimary}
                />
              </Pressable>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.9)']}
                style={styles.resultGradient}
              />
              <View style={styles.resultInfo}>
                <Text style={styles.resultTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.resultMeta}>
                  <Text style={styles.resultYear}>{item.year}</Text>
                  <View style={styles.resultRating}>
                    <Ionicons name="star" size={10} color={Colors.ratingGold} />
                    <Text style={styles.resultRatingText}>{item.vote_average?.toFixed(1)}</Text>
                  </View>
                </View>
                {item.genres?.[0] && <Text style={styles.resultGenre}>{item.genres[0]}</Text>}
              </View>
            </Pressable>
          </Animated.View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropTop: {
    position: 'absolute',
    top: -180,
    left: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.34,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceDim,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  iconButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  titleWrap: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 44,
    lineHeight: 46,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.7,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },

  // ── Search Bar ───────────────────────────
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    backgroundColor: Colors.surfaceDim,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  searchAction: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.rosePink,
  },
  searchActionPressed: {
    opacity: 0.86,
  },

  // ── Chips ────────────────────────────────
  chipsHeaderRow: {
    marginTop: Spacing.sm,
    marginBottom: 6,
    paddingHorizontal: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chipsRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  chipsCount: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  resetText: {
    fontSize: 12,
    color: Colors.rosePink,
    fontWeight: '700',
  },
  suggestionsBlock: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  suggestionsLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
  },
  trendingLabel: {
    marginTop: 8,
  },
  suggestionsRow: {
    gap: 8,
    paddingBottom: 2,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceDim,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  suggestionChipText: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  chipsContainer: {
    marginBottom: Spacing.md,
  },
  noticeBar: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceDim,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chipsList: {
    paddingHorizontal: Spacing.base,
    gap: 8,
  },
  quickFilterRow: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    gap: 8,
  },
  quickFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceDim,
  },
  quickFilterChipActive: {
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primary,
  },
  quickFilterChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  quickFilterChipTextActive: {
    color: Colors.textPrimary,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipPressed: {
    opacity: 0.88,
  },
  chipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: Colors.textInverse,
    fontWeight: '600',
  },

  // ── Grid Results ─────────────────────────
  gridRow: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  resultCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.5,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  loadingWrap: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  loadingSkeletonGrid: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  loadingSkeletonCard: {
    flex: 1,
    height: CARD_WIDTH * 1.5,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.shimmer,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: Spacing.base,
  },
  resultPoster: {
    width: '100%',
    height: '100%',
  },
  bookmarkButton: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  bookmarkButtonPressed: {
    opacity: 0.82,
  },
  resultGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '45%',
  },
  resultInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.sm,
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  resultMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultYear: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  resultRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  resultRatingText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.ratingGold,
  },
  resultGenre: {
    marginTop: 4,
    fontSize: 11,
    color: Colors.rosePale,
    fontWeight: '600',
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: Spacing.base,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  emptyActionsRow: {
    marginTop: Spacing.base,
    flexDirection: 'row',
    gap: 8,
  },
  emptyActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceDim,
  },
  emptyActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.rosePale,
  },
  didYouMeanButton: {
    marginTop: Spacing.base,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceDim,
  },
  didYouMeanText: {
    fontSize: 13,
    color: Colors.rosePink,
    fontWeight: '700',
  },

  // ── Explore ──────────────────────────────
  exploreContainer: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surfaceDim,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    gap: 6,
  },
  exploreTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  exploreSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

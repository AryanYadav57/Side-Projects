import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  FlatList,
  Dimensions,
  Pressable,
  RefreshControl,
  Linking,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

import { Colors, Spacing, BorderRadius } from '@/theme';
import { tmdbApi, type Movie, type MovieTrailerHighlight } from '@/services/api';
import { trackEvent } from '@/services/analytics';
import { getHomeFeedCache, setHomeFeedCache } from '@/services/cache';
import { getOrAssignExperimentVariant } from '@/services/experiments';
import { feedbackSelection, feedbackSuccess } from '@/services/feedback';
import { useAppStatusStore } from '@/stores/appStatus';
import { usePersonalizationFeedbackStore } from '@/stores/personalizationFeedback';
import { usePreferenceStore } from '@/stores/preferences';
import { useWatchlistStore } from '@/stores/watchlist';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FEATURED_CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.74);
const FEATURED_CARD_HEIGHT = Math.round(FEATURED_CARD_WIDTH * 1.36);
const MINI_CARD_WIDTH = Math.max(120, Math.min(148, Math.round(SCREEN_WIDTH * 0.33)));
const MINI_CARD_HEIGHT = Math.round(MINI_CARD_WIDTH * 1.56);

function toImageSource(url: string | null) {
  return url ? { uri: url } : require('../../assets/images/icon.png');
}

function toLanguageCode(label: string): string {
  const lowered = label.toLowerCase();
  if (lowered.includes('hindi')) return 'hi';
  if (lowered.includes('english')) return 'en';
  if (lowered.includes('tamil')) return 'ta';
  if (lowered.includes('telugu')) return 'te';
  if (lowered.includes('korean')) return 'ko';
  if (lowered.includes('japanese')) return 'ja';
  return lowered.slice(0, 2);
}

function sortByPreferences(movies: Movie[], genres: string[], languages: string[]): Movie[] {
  if (genres.length === 0 && languages.length === 0) return movies;

  return [...movies].sort((a, b) => {
    const aGenreScore = a.genres.filter((genre) => genres.includes(genre)).length;
    const bGenreScore = b.genres.filter((genre) => genres.includes(genre)).length;
    const aLanguageScore = languages.includes(a.language) ? 1 : 0;
    const bLanguageScore = languages.includes(b.language) ? 1 : 0;
    return bGenreScore * 3 + bLanguageScore - (aGenreScore * 3 + aLanguageScore);
  });
}

function IconButton({
  icon,
  onPress,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
  label: string;
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

const FeaturedCard = React.memo(function FeaturedCard({
  movie,
  index,
  onOpen,
  saved,
  onToggleWatchlist,
}: {
  movie: Movie;
  index: number;
  onOpen: (movie: Movie) => void;
  saved: boolean;
  onToggleWatchlist: (movie: Movie) => void;
}) {
  return (
    <Animated.View entering={FadeInRight.delay(index * 60).springify()}>
      <Pressable
        onPress={() => onOpen(movie)}
        style={({ pressed }) => [styles.featuredCard, pressed && styles.featuredCardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Open details for ${movie.title}`}
      >
        <Image
          source={toImageSource(movie.poster_url)}
          style={styles.featuredPoster}
          contentFit="cover"
          transition={260}
        />
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            onToggleWatchlist(movie);
          }}
          style={({ pressed }) => [styles.bookmarkButton, pressed && styles.bookmarkButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel={saved ? `Remove ${movie.title} from watchlist` : `Save ${movie.title} to watchlist`}
        >
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={16} color={Colors.textPrimary} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
});

const MiniPosterCard = React.memo(function MiniPosterCard({
  movie,
  index,
  onOpen,
  saved,
  onToggleWatchlist,
}: {
  movie: Movie;
  index: number;
  onOpen: (movie: Movie) => void;
  saved: boolean;
  onToggleWatchlist: (movie: Movie) => void;
}) {
  return (
    <Animated.View entering={FadeInRight.delay(index * 50).springify()}>
      <Pressable
        onPress={() => onOpen(movie)}
        style={({ pressed }) => [styles.miniCard, pressed && styles.miniCardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Open details for ${movie.title}`}
      >
        <View style={styles.miniPosterWrap}>
          <Image
            source={toImageSource(movie.poster_url)}
            style={styles.miniPoster}
            contentFit="cover"
            transition={220}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.68)']}
            locations={[0.54, 1]}
            style={styles.miniPosterFade}
          />
          <View style={styles.miniMetaPill}>
            <Text style={styles.miniMetaPillText}>{(movie.genres?.[0] || 'MOVIE').toUpperCase()}</Text>
          </View>
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onToggleWatchlist(movie);
            }}
            style={({ pressed }) => [styles.miniBookmarkButton, pressed && styles.bookmarkButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel={saved ? `Remove ${movie.title} from watchlist` : `Save ${movie.title} to watchlist`}
          >
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={14} color={Colors.textPrimary} />
          </Pressable>
        </View>
        <Text style={styles.miniTitle} numberOfLines={2}>
          {movie.title}
        </Text>
        <Text style={styles.miniSubtitle} numberOfLines={1}>{movie.year}</Text>
      </Pressable>
    </Animated.View>
  );
});

function LiveCard({ trailer }: { trailer: MovieTrailerHighlight | null }) {
  if (!trailer) return null;

  const { movie, trailerUrl } = trailer;

  const openTrailer = async () => {
    void trackEvent('trailer_tap', { movieId: movie.id, source: 'home' });
    try {
      await Linking.openURL(trailerUrl);
    } catch {
      router.push(`/movie/${movie.id}`);
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(120).springify()}>
      <Pressable
        onPress={openTrailer}
        style={({ pressed }) => [styles.liveCard, pressed && styles.liveCardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Open new trailer for ${movie.title}`}
      >
        <Image source={toImageSource(movie.poster_url)} style={styles.livePoster} contentFit="cover" />
        <View style={styles.liveInfo}>
          <Text style={styles.liveTitle} numberOfLines={1}>
            {movie.title}
          </Text>
          <Text style={styles.liveSubtitle} numberOfLines={1}>
            {movie.year} · {movie.genres?.[0] || 'Featured'}
          </Text>
        </View>
        <View style={styles.liveRight}>
          <Ionicons name="play-circle" size={16} color={Colors.rosePink} />
          <Text style={styles.liveChat}>New</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCountPill}>
        <Text style={styles.sectionCountText}>{count}</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const backendHealthy = useAppStatusStore((state) => state.backendHealthy);
  const preferences = usePreferenceStore((state) => state.preferences);
  const hasSeenOnboarding = usePreferenceStore((state) => state.hasSeenOnboarding);
  const completedOnboarding = usePreferenceStore((state) => state.completedOnboarding);
  const watchlistIds = useWatchlistStore((state) => state.movieIds);
  const addToWatchlist = useWatchlistStore((state) => state.addToWatchlist);
  const removeFromWatchlist = useWatchlistStore((state) => state.removeFromWatchlist);
  const scoreMovie = usePersonalizationFeedbackStore((state) => state.scoreMovie);
  const isHiddenMovie = usePersonalizationFeedbackStore((state) => state.isHiddenMovie);

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [loadNotice, setLoadNotice] = useState<string | null>(null);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [topRated, setTopRated] = useState<Movie[]>([]);
  const [bollywood, setBollywood] = useState<Movie[]>([]);
  const [trailerHighlight, setTrailerHighlight] = useState<MovieTrailerHighlight | null>(null);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [experimentVariant, setExperimentVariant] = useState<'control' | 'feedback_boost'>('control');

  const applyFeedbackRanking = (movies: Movie[]): Movie[] => {
    const visibleMovies = movies.filter((movie) => !isHiddenMovie(movie.id));
    if (experimentVariant !== 'feedback_boost') {
      return visibleMovies;
    }

    return [...visibleMovies].sort((a, b) => scoreMovie(b) - scoreMovie(a));
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [trendingData, topRatedData, bollywoodData, trailerData] = await Promise.all([
        tmdbApi.getTrending(),
        tmdbApi.getTopRated(),
        tmdbApi.getByLanguage('hi'),
        tmdbApi.getNewTrailerHighlight(),
      ]);
      const preferredLanguageCodes = preferences.languages.map(toLanguageCode);
      const rankedTrending = sortByPreferences(trendingData, preferences.genres, preferredLanguageCodes);
      const rankedTopRated = sortByPreferences(topRatedData, preferences.genres, preferredLanguageCodes);
      const rankedBollywood = sortByPreferences(bollywoodData, preferences.genres, preferredLanguageCodes);
      const personalizedTrending = applyFeedbackRanking(rankedTrending);
      const personalizedTopRated = applyFeedbackRanking(rankedTopRated);
      const personalizedBollywood = applyFeedbackRanking(rankedBollywood);

      setTrending(personalizedTrending);
      setTopRated(personalizedTopRated);
      setBollywood(personalizedBollywood);
      setUsingCachedData(false);
      setLoadNotice(null);

      if (trailerData) {
        setTrailerHighlight(trailerData);
      } else {
        const fallbackMovie = topRatedData[0] ?? trendingData[0] ?? null;
        if (fallbackMovie) {
          const searchQuery = encodeURIComponent(
            `${fallbackMovie.title} ${fallbackMovie.year} official trailer`
          );
          setTrailerHighlight({
            movie: fallbackMovie,
            trailerUrl: `https://www.youtube.com/results?search_query=${searchQuery}`,
          });
        } else {
          setTrailerHighlight(null);
        }
      }

      await setHomeFeedCache({
        trending: personalizedTrending,
        topRated: personalizedTopRated,
        bollywood: personalizedBollywood,
        trailerHighlight: trailerData,
      });
    } catch (error) {
      console.error('Failed to fetch home feed:', error);

      const cached = await getHomeFeedCache();
      if (cached) {
        setTrending(cached.trending);
        setTopRated(cached.topRated);
        setBollywood(cached.bollywood);
        setTrailerHighlight(cached.trailerHighlight);
        setUsingCachedData(true);
        setLoadNotice('Showing last saved feed while connection recovers.');
      } else {
        setLoadNotice('Unable to load movies right now. Pull to retry.');
      }
    } finally {
      setLoading(false);
    }
  };

  const openMovie = (movie: Movie) => {
    void trackEvent('movie_open', { movieId: movie.id, source: 'home' });
    router.push(`/movie/${movie.id}`);
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

  useEffect(() => {
    let isMounted = true;
    void getOrAssignExperimentVariant('home_personalization_ranking', ['control', 'feedback_boost']).then((variant) => {
      if (!isMounted) return;
      setExperimentVariant(variant === 'feedback_boost' ? 'feedback_boost' : 'control');
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, [preferences.genres, preferences.languages, experimentVariant]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const featured = useMemo(() => trending.slice(0, 8), [trending]);
  const firstFeatured = featured[0] ?? null;

  const onFeaturedScrollEnd = (offsetX: number) => {
    const stride = FEATURED_CARD_WIDTH + 12;
    const index = Math.round(offsetX / stride);
    setFeaturedIndex(Math.max(0, Math.min(index, Math.max(featured.length - 1, 0))));
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <IconButton icon="person" label="Open profile" onPress={() => router.push('/profile')} />
          <IconButton icon="search" label="Search movies" onPress={() => router.push('/search')} />
        </View>

        <View style={styles.titleWrap}>
          <Text style={styles.pageTitle}>Movies</Text>
          <Text style={styles.pageSubtitle}>
            {experimentVariant === 'feedback_boost'
              ? 'Adaptive picks tuned from your feedback'
              : completedOnboarding && preferences.genres[0]
              ? `Picked for your ${preferences.genres[0]} taste`
              : 'Popular now'}
          </Text>
        </View>

        {hasSeenOnboarding && !completedOnboarding && (
          <Pressable style={styles.profilePrompt} onPress={() => router.push('/onboarding' as any)}>
            <View style={styles.profilePromptLeft}>
              <Ionicons name="sparkles-outline" size={16} color={Colors.rosePink} />
              <Text style={styles.profilePromptText}>Complete your taste profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
          </Pressable>
        )}

        {backendHealthy === false && (
          <View style={styles.noticeBar}>
            <Ionicons name="cloud-offline-outline" size={14} color={Colors.warning} />
            <Text style={styles.noticeText}>CineBot service is currently offline.</Text>
          </View>
        )}

        {loadNotice && (
          <View style={styles.noticeBar}>
            <Ionicons name={usingCachedData ? 'download-outline' : 'alert-circle-outline'} size={14} color={Colors.warning} />
            <Text style={styles.noticeText}>{loadNotice}</Text>
          </View>
        )}

        <FlatList
          horizontal
          data={loading ? [] : featured}
          renderItem={({ item, index }) => (
            <FeaturedCard
              movie={item}
              index={index}
              onOpen={openMovie}
              saved={watchlistIds.includes(item.id)}
              onToggleWatchlist={toggleWatchlist}
            />
          )}
          keyExtractor={(item) => String(item.id)}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredList}
          snapToInterval={FEATURED_CARD_WIDTH + 12}
          decelerationRate="fast"
          snapToAlignment="start"
          onMomentumScrollEnd={(event) => onFeaturedScrollEnd(event.nativeEvent.contentOffset.x)}
          ListEmptyComponent={<View style={styles.featuredSkeleton} />}
        />

        {featured.length > 1 && (
          <View style={styles.dotsRow}>
            {featured.slice(0, 5).map((_, idx) => (
              <View
                key={`dot-${idx}`}
                style={[styles.dot, idx === featuredIndex && styles.dotActive]}
              />
            ))}
          </View>
        )}

        <Text style={styles.featuredCaption} numberOfLines={2}>
          {featured[featuredIndex]?.overview || 'Fresh picks, handpicked for your next movie night.'}
        </Text>

        <View style={styles.liveCardWrap}>
          <LiveCard trailer={trailerHighlight} />
        </View>

        <SectionHeader title="For You Tonight" count={topRated.slice(1, 8).length} />
        <FlatList
          horizontal
          data={topRated.slice(1, 8)}
          renderItem={({ item, index }) => (
            <MiniPosterCard
              movie={item}
              index={index}
              onOpen={openMovie}
              saved={watchlistIds.includes(item.id)}
              onToggleWatchlist={toggleWatchlist}
            />
          )}
          keyExtractor={(item) => `top-${item.id}`}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.miniList}
        />

        <SectionHeader title="Popular in Hindi" count={bollywood.slice(0, 8).length} />
        <FlatList
          horizontal
          data={bollywood.slice(0, 8)}
          renderItem={({ item, index }) => (
            <MiniPosterCard
              movie={item}
              index={index}
              onOpen={openMovie}
              saved={watchlistIds.includes(item.id)}
              onToggleWatchlist={toggleWatchlist}
            />
          )}
          keyExtractor={(item) => `hi-${item.id}`}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.miniList}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },

  header: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  pageTitle: {
    fontSize: 48,
    lineHeight: 52,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.8,
  },
  pageSubtitle: {
    fontSize: 38,
    lineHeight: 40,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  profilePrompt: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceDim,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profilePromptLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profilePromptText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  featuredList: {
    paddingHorizontal: Spacing.base,
    gap: 12,
  },
  featuredCard: {
    width: FEATURED_CARD_WIDTH,
    height: FEATURED_CARD_HEIGHT,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  featuredCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  featuredPoster: {
    width: '100%',
    height: '100%',
  },
  bookmarkButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkButtonPressed: {
    opacity: 0.85,
  },
  featuredSkeleton: {
    width: FEATURED_CARD_WIDTH,
    height: FEATURED_CARD_HEIGHT,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.shimmer,
  },
  featuredCaption: {
    marginTop: 10,
    paddingHorizontal: Spacing.base,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.textSecondary,
    fontWeight: '500',
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
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  dotsRow: {
    marginTop: 14,
    marginBottom: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceBorder,
  },
  dotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.rosePink,
  },

  liveCardWrap: {
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  liveCard: {
    minHeight: 92,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surfaceDim,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveCardPressed: {
    opacity: 0.92,
  },
  livePoster: {
    width: 44,
    height: 62,
    borderRadius: BorderRadius.sm,
  },
  liveInfo: {
    flex: 1,
  },
  liveTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  liveSubtitle: {
    marginTop: 2,
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  liveRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveChat: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.rosePink,
  },

  sectionHeaderRow: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  sectionCountPill: {
    minWidth: 30,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.rosePale,
  },
  miniList: {
    paddingHorizontal: Spacing.base,
    gap: 14,
    marginBottom: Spacing.xl + 2,
    paddingRight: Spacing.base + 2,
  },
  miniCard: {
    width: MINI_CARD_WIDTH,
  },
  miniCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  miniPoster: {
    width: MINI_CARD_WIDTH,
    height: MINI_CARD_HEIGHT,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  miniPosterWrap: {
    position: 'relative',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  miniPosterFade: {
    ...StyleSheet.absoluteFillObject,
  },
  miniMetaPill: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  miniBookmarkButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniMetaPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.rosePale,
    letterSpacing: 0.7,
  },
  miniTitle: {
    marginTop: 9,
    fontSize: 14,
    lineHeight: 19,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  miniSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});

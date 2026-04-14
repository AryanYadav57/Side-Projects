import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  FlatList,
  Linking,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';

import { Colors, Spacing, BorderRadius } from '@/theme';
import { tmdbApi, type Movie, type MovieDetail, type MovieTrailerInfo } from '@/services/api';
import { trackEvent } from '@/services/analytics';
import { feedbackSelection, feedbackSuccess } from '@/services/feedback';
import { usePersonalizationFeedbackStore } from '@/stores/personalizationFeedback';
import { useWatchlistStore } from '@/stores/watchlist';

function toImageSource(url?: string | null) {
  return url ? { uri: url } : require('../../assets/images/icon.png');
}

function formatRuntime(runtime?: number | null) {
  if (!runtime) return null;
  const h = Math.floor(runtime / 60);
  const m = runtime % 60;
  return `${h}H ${m}M`;
}

function providerInitial(name: string) {
  return name[0]?.toUpperCase() || 'P';
}

// ── Star Rating Component ───────────────────────
function StarRating({ rating, onRate }: { rating: number; onRate: (n: number) => void }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map(n => (
        <Pressable
          key={n}
          onPress={() => onRate(n)}
          style={styles.starButton}
          accessibilityRole="button"
          accessibilityLabel={`Rate ${n} stars`}
        >
          <Ionicons
            name={n <= rating ? 'star' : 'star-outline'}
            size={28}
            color={n <= rating ? Colors.ratingGold : Colors.textTertiary}
          />
        </Pressable>
      ))}
    </View>
  );
}

export default function MovieDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);
  const [becauseYouLiked, setBecauseYouLiked] = useState<Movie[]>([]);
  const [trailerInfo, setTrailerInfo] = useState<MovieTrailerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState(0);
  const [selectedFeedbackAction, setSelectedFeedbackAction] = useState<
    'not_interested' | 'more_like_this' | 'seen_already' | null
  >(null);
  const watchlistIds = useWatchlistStore((state) => state.movieIds);
  const addToWatchlist = useWatchlistStore((state) => state.addToWatchlist);
  const removeFromWatchlist = useWatchlistStore((state) => state.removeFromWatchlist);
  const markNotInterested = usePersonalizationFeedbackStore((state) => state.markNotInterested);
  const markSeen = usePersonalizationFeedbackStore((state) => state.markSeen);
  const markMoreLike = usePersonalizationFeedbackStore((state) => state.markMoreLike);

  const inWatchlist = !!(id && watchlistIds.includes(Number(id)));

  const toggleWatchlist = async () => {
    if (!movie) return;

    await feedbackSelection();

    if (inWatchlist) {
      await removeFromWatchlist(movie.id);
      return;
    }

    const added = await addToWatchlist(movie.id);
    if (added) {
      await feedbackSuccess();
      void trackEvent('watchlist_add', { movieId: movie.id, source: 'detail' });
    }
  };

  const openTrailer = async () => {
    if (!movie) return;

    const fallbackQuery = encodeURIComponent(`${movie.title} ${movie.year} official trailer`);
    const target = trailerInfo?.trailerUrl || `https://www.youtube.com/results?search_query=${fallbackQuery}`;
    try {
      await Linking.openURL(target);
    } catch {
      // no-op
    }
  };

  const openWhereToWatch = async () => {
    if (!movie) return;
    const firstPlatform = movie.platforms?.[0]?.name;
    const query = encodeURIComponent(
      firstPlatform ? `${movie.title} watch on ${firstPlatform}` : `${movie.title} where to watch`
    );
    try {
      await Linking.openURL(`https://www.google.com/search?q=${query}`);
    } catch {
      // no-op
    }
  };

  const submitFeedback = async (action: 'not_interested' | 'more_like_this' | 'seen_already') => {
    if (!movie) return;

    await feedbackSelection();

    if (action === 'not_interested') {
      await markNotInterested({ id: movie.id });
    } else if (action === 'seen_already') {
      await markSeen({ id: movie.id });
    } else {
      await markMoreLike({ id: movie.id, genres: movie.genres || [] });
    }

    await feedbackSuccess();
    setSelectedFeedbackAction(action);
    void trackEvent('movie_feedback', {
      movieId: movie.id,
      action,
      source: 'detail',
    });
  };

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        if (id) {
          const movieId = Number(id);
          const data = await tmdbApi.getMovieDetail(movieId);
          setMovie(data);

          const [similarData, becauseData, trailerData] = await Promise.all([
            tmdbApi.getSimilarMovies(movieId),
            data.genres?.[0] ? tmdbApi.getByGenreName(data.genres[0]) : tmdbApi.getTopRated(),
            tmdbApi.getMovieTrailer(movieId),
          ]);

          setSimilarMovies(similarData.filter((item) => item.id !== movieId).slice(0, 8));
          setBecauseYouLiked(becauseData.filter((item) => item.id !== movieId).slice(0, 8));
          setTrailerInfo(trailerData);
        }
      } catch (error) {
        console.error('Failed to fetch movie:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMovie();
  }, [id]);

  if (loading || !movie) {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={styles.detailSkeletonWrap}>
          <View style={styles.detailSkeletonHero} />
          <View style={styles.detailSkeletonLineLg} />
          <View style={styles.detailSkeletonLineMd} />
          <View style={styles.detailSkeletonCard} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Spacing.xl + 24 }}
      >
        <View style={styles.backdropContainer}>
          <Image
            source={toImageSource(movie.backdrop_url || movie.poster_url)}
            style={styles.backdrop}
            contentFit="cover"
            transition={500}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.04)', 'rgba(0,0,0,0.24)', 'rgba(17,19,23,0.58)', 'rgba(17,19,23,0.86)', Colors.background]}
            locations={[0, 0.34, 0.68, 0.9, 1]}
            style={styles.backdropGradient}
          />

          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}> 
            <Pressable style={styles.topIconButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
              <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
            </Pressable>
            <Text style={styles.topTitle}>CineMatch</Text>
            <Pressable
              style={styles.topIconButton}
              onPress={openTrailer}
              accessibilityRole="button"
              accessibilityLabel="Watch trailer"
            >
              <Ionicons name="play-circle-outline" size={20} color={Colors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.heroContent}>
            <View style={styles.rankRow}>
              <View style={styles.rankChip}>
                <Text style={styles.rankChipText}>RANK</Text>
                <Text style={styles.rankValue}>#1</Text>
              </View>
              {trailerInfo?.isNew && (
                <View style={styles.newTrailerBadge}>
                  <Ionicons name="flash-outline" size={12} color={Colors.rosePale} />
                  <Text style={styles.newTrailerBadgeText}>NEW TRAILER</Text>
                </View>
              )}
              <Ionicons name="star" size={14} color={Colors.roseLight} />
              <Text style={styles.heroScore}>{movie.vote_average?.toFixed(1)}</Text>
            </View>

            <Text style={styles.heroTitle}>{movie.title}</Text>

            <View style={styles.metaRow}>
              {movie.genres?.[0] ? <Text style={styles.metaText}>{movie.genres[0].toUpperCase()}</Text> : null}
              <View style={styles.metaDot} />
              <Text style={styles.metaText}>{movie.year}</Text>
              {formatRuntime(movie.runtime) ? (
                <>
                  <View style={styles.metaDot} />
                  <Text style={styles.metaText}>{formatRuntime(movie.runtime)}</Text>
                </>
              ) : null}
            </View>

            <View style={styles.heroActionsRow}>
              <Pressable
                style={({ pressed }) => [styles.primaryActionButton, pressed && styles.primaryActionButtonPressed]}
                onPress={openTrailer}
                accessibilityRole="button"
                accessibilityLabel="Watch trailer"
              >
                <Ionicons name="play" size={15} color={Colors.textPrimary} />
                <Text style={styles.primaryActionText}>Watch Trailer</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.secondaryActionButton, pressed && styles.secondaryActionButtonPressed]}
                onPress={toggleWatchlist}
                accessibilityRole="button"
                accessibilityLabel={inWatchlist ? 'Remove from watchlist' : 'Save to watchlist'}
              >
                <Ionicons name={inWatchlist ? 'bookmark' : 'bookmark-outline'} size={15} color={Colors.rosePale} />
                <Text style={styles.secondaryActionText}>{inWatchlist ? 'Saved' : 'Save'}</Text>
              </Pressable>
            </View>

            <View style={styles.feedbackSection}>
              <View style={styles.feedbackRow}>
                <Pressable
                  onPress={() => submitFeedback('not_interested')}
                  style={({ pressed }) => [
                    styles.feedbackChip,
                    selectedFeedbackAction === 'not_interested' && styles.feedbackChipActive,
                    pressed && styles.feedbackChipPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Mark not interested"
                >
                  <Ionicons name="remove-circle-outline" size={12} color={Colors.rosePale} />
                  <Text style={styles.feedbackChipText}>Not interested</Text>
                </Pressable>

                <Pressable
                  onPress={() => submitFeedback('more_like_this')}
                  style={({ pressed }) => [
                    styles.feedbackChip,
                    selectedFeedbackAction === 'more_like_this' && styles.feedbackChipActive,
                    pressed && styles.feedbackChipPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Show more like this"
                >
                  <Ionicons name="thumbs-up-outline" size={12} color={Colors.rosePale} />
                  <Text style={styles.feedbackChipText}>More like this</Text>
                </Pressable>

                <Pressable
                  onPress={() => submitFeedback('seen_already')}
                  style={({ pressed }) => [
                    styles.feedbackChip,
                    selectedFeedbackAction === 'seen_already' && styles.feedbackChipActive,
                    pressed && styles.feedbackChipPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Mark as seen"
                >
                  <Ionicons name="checkmark-circle-outline" size={12} color={Colors.rosePale} />
                  <Text style={styles.feedbackChipText}>Seen already</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        <Animated.View entering={FadeInDown.delay(120)} style={[styles.sectionBlock, styles.firstSectionBlock]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>AVAILABLE ON</Text>
            <Pressable
              style={({ pressed }) => [styles.platformLinkButton, pressed && styles.platformLinkButtonPressed]}
              onPress={openWhereToWatch}
              accessibilityRole="button"
              accessibilityLabel="Open where to watch"
            >
              <Ionicons name="tv-outline" size={12} color={Colors.textSecondary} />
              <Text style={styles.platformLinkButtonText}>Open</Text>
            </Pressable>
          </View>
          <View style={styles.platformRow}>
            {(movie.platforms || []).slice(0, 1).map((platform) => (
              <View key={platform.name} style={styles.platformChip}>
                <View style={styles.platformIcon}>
                  <Text style={styles.platformIconText}>{providerInitial(platform.name)}</Text>
                </View>
                <Text style={styles.platformText}>{platform.name}</Text>
              </View>
            ))}
            {(movie.platforms || []).length > 1 && (
              <View style={styles.platformChip}>
                <Text style={styles.platformText}>+{movie.platforms.length - 1} More</Text>
              </View>
            )}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160)} style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>THE STORY</Text>
          <Text style={styles.synopsis}>{movie.overview}</Text>
        </Animated.View>

        {movie.cast && movie.cast.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200)} style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>LEADING CAST</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="View full cast">
                <Text style={styles.viewAllText}>View All</Text>
              </Pressable>
            </View>
            <FlatList
              horizontal
              data={movie.cast.slice(0, 8)}
              initialNumToRender={4}
              maxToRenderPerBatch={4}
              windowSize={5}
              removeClippedSubviews
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.castList}
              keyExtractor={(item) => item.name}
              renderItem={({ item, index }) => (
                <Animated.View entering={FadeInRight.delay(index * 70)} style={styles.castCard}>
                  <Image source={toImageSource(item.profile_url)} style={styles.castImage} contentFit="cover" />
                  <Text style={styles.castName} numberOfLines={1}>{item.name}</Text>
                </Animated.View>
              )}
            />
          </Animated.View>
        )}

        {similarMovies.length > 0 && (
          <Animated.View entering={FadeInDown.delay(240)} style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>SIMILAR PICKS</Text>
            <FlatList
              horizontal
              data={similarMovies.slice(0, 8)}
              initialNumToRender={4}
              maxToRenderPerBatch={4}
              windowSize={5}
              removeClippedSubviews
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.relatedList}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.relatedCard, pressed && styles.relatedCardPressed]}
                  onPress={() => router.push(`/movie/${item.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open details for ${item.title}`}
                >
                  <Image source={toImageSource(item.poster_url)} style={styles.relatedImage} contentFit="cover" />
                  <View style={styles.relatedRatingBadge}>
                    <Text style={styles.relatedRatingText}>{item.vote_average?.toFixed(1)}</Text>
                  </View>
                  <Text style={styles.relatedTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.relatedMeta} numberOfLines={1}>
                    {(item.genres?.[0] || 'MOVIE').toUpperCase()} • {item.year}
                  </Text>
                </Pressable>
              )}
            />
          </Animated.View>
        )}

        {becauseYouLiked.length > 0 && (
          <Animated.View entering={FadeInDown.delay(260)} style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>
              {movie.genres?.[0] ? `BECAUSE YOU LIKE ${movie.genres[0].toUpperCase()}` : 'BECAUSE YOU LIKED THIS'}
            </Text>
            <FlatList
              horizontal
              data={becauseYouLiked.slice(0, 8)}
              initialNumToRender={4}
              maxToRenderPerBatch={4}
              windowSize={5}
              removeClippedSubviews
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.relatedList}
              keyExtractor={(item) => `because-${item.id}`}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.relatedCard, pressed && styles.relatedCardPressed]}
                  onPress={() => router.push(`/movie/${item.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open details for ${item.title}`}
                >
                  <Image source={toImageSource(item.poster_url)} style={styles.relatedImage} contentFit="cover" />
                  <View style={styles.relatedRatingBadge}>
                    <Text style={styles.relatedRatingText}>{item.vote_average?.toFixed(1)}</Text>
                  </View>
                  <Text style={styles.relatedTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.relatedMeta} numberOfLines={1}>
                    {(item.genres?.[0] || 'MOVIE').toUpperCase()} • {item.year}
                  </Text>
                </Pressable>
              )}
            />
          </Animated.View>
        )}

        <Animated.View entering={FadeIn.delay(280)} style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>RATE THIS MOVIE</Text>
          <StarRating rating={userRating} onRate={setUserRating} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailSkeletonWrap: {
    width: '100%',
    paddingHorizontal: Spacing.base,
    gap: 12,
  },
  detailSkeletonHero: {
    width: '100%',
    height: 240,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.shimmer,
  },
  detailSkeletonLineLg: {
    marginTop: 8,
    width: '72%',
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.shimmer,
  },
  detailSkeletonLineMd: {
    width: '56%',
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.shimmer,
  },
  detailSkeletonCard: {
    marginTop: 4,
    width: '100%',
    height: 160,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.shimmer,
  },

  // ── Backdrop ─────────────────────────────
  backdropContainer: {
    height: 472,
    position: 'relative',
    overflow: 'hidden',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: '100%',
  },
  backdropGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 33,
    lineHeight: 36,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    marginTop: -5,
  },
  heroContent: {
    position: 'absolute',
    left: Spacing.base,
    right: Spacing.base,
    bottom: 10,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  newTrailerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(99,46,46,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(232,197,197,0.35)',
  },
  newTrailerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.rosePale,
    letterSpacing: 0.7,
  },
  rankChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(99, 46, 46, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(232, 197, 197, 0.35)',
  },
  rankChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.rosePale,
    letterSpacing: 1,
  },
  rankValue: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.rosePale,
  },
  heroScore: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  heroTitle: {
    fontSize: 44,
    lineHeight: 48,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.8,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 15,
    color: Colors.rosePale,
    fontWeight: '500',
    letterSpacing: 0.6,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.tertiaryLight,
  },
  heroActionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryActionButton: {
    flex: 1,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(99,46,46,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryActionButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  primaryActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  secondaryActionButton: {
    flex: 0.72,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(232,197,197,0.35)',
    backgroundColor: 'rgba(0,0,0,0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryActionButtonPressed: {
    opacity: 0.88,
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.rosePale,
  },
  feedbackSection: {
    marginTop: 10,
  },
  feedbackChip: {
    flex: 1,
    minWidth: 0,
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(232,197,197,0.28)',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  feedbackChipActive: {
    backgroundColor: 'rgba(99,46,46,0.75)',
    borderColor: 'rgba(232,197,197,0.45)',
  },
  feedbackChipPressed: {
    opacity: 0.86,
  },
  feedbackChipText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.rosePale,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },

  sectionBlock: {
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.xl + 2,
  },
  firstSectionBlock: {
    marginTop: 0,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.roseLight,
    letterSpacing: 1.3,
    marginBottom: 0,
  },
  platformLinkButton: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceDim,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  platformLinkButtonPressed: {
    opacity: 0.86,
  },
  platformLinkButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.roseLight,
    fontWeight: '700',
  },

  platformRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  platformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceDim,
    borderRadius: BorderRadius.full,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  platformIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformIconText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.rosePale,
  },
  platformText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },

  synopsis: {
    fontSize: 16,
    lineHeight: 28,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  // ── Cast ─────────────────────────────────
  castList: {
    gap: 16,
  },
  castCard: {
    alignItems: 'center',
    width: 92,
  },
  castImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.primaryMuted,
    marginBottom: 8,
  },
  castName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  castCharacter: {
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: 'center',
  },

  relatedList: {
    gap: 12,
  },
  relatedCard: {
    width: 196,
  },
  relatedCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  relatedImage: {
    width: 196,
    height: 264,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
  },
  relatedRatingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 7,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  relatedRatingText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  relatedTitle: {
    marginTop: 9,
    fontSize: 19,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  relatedMeta: {
    marginTop: 2,
    fontSize: 13,
    color: Colors.rosePale,
    fontWeight: '500',
  },

  bottomCtaWrap: {
    position: 'absolute',
    left: Spacing.base,
    right: Spacing.base,
    bottom: 0,
    paddingTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  watchlistButton: {
    flex: 1,
    height: 46,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(162, 116, 109, 0.78)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  watchlistButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  watchlistButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  shareFab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Star Rating ──────────────────────────
  starRow: {
    flexDirection: 'row',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
});

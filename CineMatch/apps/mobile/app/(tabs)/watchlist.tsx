import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, FlatList } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';

import { Colors, Spacing, BorderRadius } from '@/theme';
import { tmdbApi, type MovieDetail } from '@/services/api';
import { feedbackSelection, feedbackSuccess } from '@/services/feedback';
import { useWatchlistStore } from '@/stores/watchlist';

type SortKey = 'recent' | 'rating' | 'year' | 'language';
type ReminderFilter = 'all' | 'new' | 'streaming' | 'leaving';

function toImageSource(url?: string | null) {
  return url ? { uri: url } : require('../../assets/images/icon.png');
}

function getReminderType(movie: MovieDetail): Exclude<ReminderFilter, 'all'> {
  const currentYear = new Date().getFullYear();
  if (!movie.platforms || movie.platforms.length === 0) return 'leaving';
  if (movie.year >= currentYear - 1) return 'new';
  return 'streaming';
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

export default function WatchlistScreen() {
  const insets = useSafeAreaInsets();
  const watchlistIds = useWatchlistStore((state) => state.movieIds);
  const refreshWatchlist = useWatchlistStore((state) => state.refresh);
  const removeFromWatchlist = useWatchlistStore((state) => state.removeFromWatchlist);
  const watchlistError = useWatchlistStore((state) => state.error);

  const [loading, setLoading] = useState(false);
  const [movies, setMovies] = useState<MovieDetail[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [reminderFilter, setReminderFilter] = useState<ReminderFilter>('all');

  useFocusEffect(
    useCallback(() => {
      void refreshWatchlist();
    }, [refreshWatchlist])
  );

  useEffect(() => {
    const loadMovies = async () => {
      if (watchlistIds.length === 0) {
        setMovies([]);
        return;
      }

      setLoading(true);
      try {
        const details = await Promise.all(
          watchlistIds.map(async (movieId) => {
            try {
              return await tmdbApi.getMovieDetail(movieId);
            } catch {
              return null;
            }
          })
        );

        setMovies(details.filter(Boolean) as MovieDetail[]);
      } finally {
        setLoading(false);
      }
    };

    void loadMovies();
  }, [watchlistIds]);

  const recentOrder = useMemo(() => {
    const map = new Map<number, number>();
    [...watchlistIds].reverse().forEach((id, index) => map.set(id, index));
    return map;
  }, [watchlistIds]);

  const reminderCounts = useMemo(() => {
    const counts = { new: 0, streaming: 0, leaving: 0 };
    movies.forEach((movie) => {
      counts[getReminderType(movie)] += 1;
    });
    return counts;
  }, [movies]);

  const filteredMovies = useMemo(() => {
    let next = [...movies];

    if (reminderFilter !== 'all') {
      next = next.filter((movie) => getReminderType(movie) === reminderFilter);
    }

    if (sortKey === 'rating') {
      next.sort((a, b) => b.vote_average - a.vote_average);
    } else if (sortKey === 'year') {
      next.sort((a, b) => b.year - a.year);
    } else if (sortKey === 'language') {
      next.sort((a, b) => a.language.localeCompare(b.language));
    } else {
      next.sort((a, b) => (recentOrder.get(a.id) ?? 0) - (recentOrder.get(b.id) ?? 0));
    }

    return next;
  }, [movies, recentOrder, reminderFilter, sortKey]);

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.backdrop}>
        <LinearGradient colors={[Colors.primaryMuted, 'transparent']} style={styles.backdropTop} />
      </View>

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}> 
        <IconButton icon="time-outline" label="Open CineBot" onPress={() => router.push('/cinebot')} />
        <IconButton icon="search" label="Search movies" onPress={() => router.push('/search')} />
      </View>

      <View style={styles.titleWrap}>
        <Text style={styles.title}>Watchlist</Text>
        <Text style={styles.subtitle}>{watchlistIds.length} movies saved</Text>
      </View>

      {watchlistError ? (
        <View style={styles.noticeBar}>
          <Ionicons name="cloud-offline-outline" size={14} color={Colors.warning} />
          <Text style={styles.noticeText}>Watchlist sync failed. Showing latest available state.</Text>
        </View>
      ) : null}

      {watchlistIds.length > 0 && (
        <Animated.View entering={FadeInDown.delay(120)} style={styles.remindersWrap}>
          <Text style={styles.remindersTitle}>Reminders</Text>
          <View style={styles.reminderChips}>
            <Pressable onPress={() => setReminderFilter('new')} style={[styles.reminderChip, reminderFilter === 'new' && styles.reminderChipActive]}>
              <Text style={styles.reminderChipText}>New trailer {reminderCounts.new}</Text>
            </Pressable>
            <Pressable onPress={() => setReminderFilter('streaming')} style={[styles.reminderChip, reminderFilter === 'streaming' && styles.reminderChipActive]}>
              <Text style={styles.reminderChipText}>Now streaming {reminderCounts.streaming}</Text>
            </Pressable>
            <Pressable onPress={() => setReminderFilter('leaving')} style={[styles.reminderChip, reminderFilter === 'leaving' && styles.reminderChipActive]}>
              <Text style={styles.reminderChipText}>Leaving soon {reminderCounts.leaving}</Text>
            </Pressable>
            <Pressable onPress={() => setReminderFilter('all')} style={[styles.reminderChip, reminderFilter === 'all' && styles.reminderChipActive]}>
              <Text style={styles.reminderChipText}>All</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {watchlistIds.length > 0 && (
        <Animated.View entering={FadeInDown.delay(150)} style={styles.sortWrap}>
          <Text style={styles.sortLabel}>Sort</Text>
          <View style={styles.sortChips}>
            {([
              ['recent', 'Recently added'],
              ['rating', 'Rating'],
              ['year', 'Year'],
              ['language', 'Language'],
            ] as Array<[SortKey, string]>).map(([key, label]) => (
              <Pressable key={key} onPress={() => setSortKey(key)} style={[styles.sortChip, sortKey === key && styles.sortChipActive]}>
                <Text style={[styles.sortChipText, sortKey === key && styles.sortChipTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      )}

      {watchlistIds.length === 0 ? (
        <Animated.View entering={FadeInDown.delay(200)} style={styles.emptyState}>
          <LinearGradient colors={[Colors.primaryMuted, Colors.surfaceDim]} style={styles.emptyIcon}>
            <Ionicons name="bookmark-outline" size={56} color={Colors.rosePink} />
          </LinearGradient>
          <Text style={styles.emptyTitle}>Your watchlist is empty</Text>
          <Text style={styles.emptySubtitle}>
            Save movies you want to watch later and we will surface trailer, streaming, and leaving-soon reminders.
          </Text>
          <Pressable style={({ pressed }) => [styles.exploreButton, pressed && styles.exploreButtonPressed]} onPress={() => router.push('/search')}>
            <Ionicons name="compass-outline" size={18} color={Colors.textInverse} />
            <Text style={styles.exploreButtonText}>Explore Movies</Text>
          </Pressable>

          <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]} onPress={() => router.push('/')}>
            <Ionicons name="sparkles-outline" size={16} color={Colors.rosePink} />
            <Text style={styles.secondaryButtonText}>Browse Trending</Text>
          </Pressable>
        </Animated.View>
      ) : (
        <FlatList
          data={filteredMovies}
          keyExtractor={(item) => String(item.id)}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={6}
          removeClippedSubviews
          contentContainerStyle={{ paddingHorizontal: Spacing.base, paddingBottom: insets.bottom + 96 }}
          ListEmptyComponent={
            loading ? (
              <View style={styles.loadingWrap}>
                <Text style={styles.loadingText}>Loading your watchlist...</Text>
                <View style={styles.loadingSkeletonRow}>
                  <View style={styles.loadingPoster} />
                  <View style={styles.loadingTextBlock}>
                    <View style={styles.loadingLineLg} />
                    <View style={styles.loadingLineMd} />
                    <View style={styles.loadingLineSm} />
                  </View>
                </View>
                <View style={styles.loadingSkeletonRow}>
                  <View style={styles.loadingPoster} />
                  <View style={styles.loadingTextBlock}>
                    <View style={styles.loadingLineLg} />
                    <View style={styles.loadingLineMd} />
                    <View style={styles.loadingLineSm} />
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.loadingWrap}>
                <Text style={styles.loadingText}>No movies match this filter.</Text>
              </View>
            )
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 40)} style={styles.movieCard}>
              <Pressable style={styles.moviePress} onPress={() => router.push(`/movie/${item.id}`)}>
                <Image source={toImageSource(item.poster_url)} style={styles.moviePoster} contentFit="cover" />
                <View style={styles.movieInfo}>
                  <Text style={styles.movieTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.movieMeta} numberOfLines={1}>
                    {item.year} · {(item.genres?.[0] || 'Movie')} · ⭐ {item.vote_average.toFixed(1)}
                  </Text>
                  <Text style={styles.moviePlatform} numberOfLines={1}>
                    {item.platforms?.[0]?.name ? `Available on ${item.platforms[0].name}` : 'Availability updating'}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View style={styles.reminderBadge}>
                      <Text style={styles.reminderBadgeText}>
                        {getReminderType(item) === 'new' ? 'New trailer' : getReminderType(item) === 'streaming' ? 'Now streaming' : 'Leaving soon'}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>

              <Pressable
                style={styles.removeButton}
                onPress={async () => {
                  await feedbackSelection();
                  const removed = await removeFromWatchlist(item.id);
                  if (removed) {
                    await feedbackSuccess();
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.title} from watchlist`}
              >
                <Ionicons name="trash-outline" size={16} color={Colors.textSecondary} />
              </Pressable>
            </Animated.View>
          )}
        />
      )}
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
    top: -170,
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
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  remindersWrap: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  remindersTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  reminderChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderChip: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceDim,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  reminderChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryLight,
  },
  reminderChipText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  sortWrap: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  sortLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  sortChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceDim,
  },
  sortChipActive: {
    borderColor: Colors.rosePink,
  },
  sortChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  sortChipTextActive: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  emptyState: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceDim,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.rosePink,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  exploreButtonPressed: {
    opacity: 0.86,
  },
  exploreButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textInverse,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  secondaryButtonPressed: {
    opacity: 0.88,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  loadingWrap: {
    marginTop: Spacing.base,
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceDim,
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  loadingSkeletonRow: {
    marginTop: Spacing.sm,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingPoster: {
    width: 52,
    height: 76,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.shimmer,
  },
  loadingTextBlock: {
    flex: 1,
    gap: 8,
  },
  loadingLineLg: {
    height: 10,
    width: '80%',
    borderRadius: 5,
    backgroundColor: Colors.shimmer,
  },
  loadingLineMd: {
    height: 10,
    width: '64%',
    borderRadius: 5,
    backgroundColor: Colors.shimmer,
  },
  loadingLineSm: {
    height: 10,
    width: '44%',
    borderRadius: 5,
    backgroundColor: Colors.shimmer,
  },
  movieCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceDim,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  moviePress: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingRight: 42,
  },
  moviePoster: {
    width: 58,
    height: 86,
    borderRadius: BorderRadius.md,
  },
  movieInfo: {
    flex: 1,
    marginLeft: 10,
  },
  movieTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  movieMeta: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  moviePlatform: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.rosePink,
    fontWeight: '600',
  },
  badgeRow: {
    marginTop: 8,
    flexDirection: 'row',
  },
  reminderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  reminderBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  removeButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
});

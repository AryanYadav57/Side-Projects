import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Colors, Spacing, BorderRadius } from '@/theme';
import { getTrackedEvents, type AnalyticsEvent, type AnalyticsEventName } from '@/services/analytics';
import { getExperimentVariant } from '@/services/experiments';
import { updatePreferences } from '@/services/preferences';
import { usePersonalizationFeedbackStore } from '@/stores/personalizationFeedback';
import { usePreferenceStore } from '@/stores/preferences';
import { useWatchlistStore } from '@/stores/watchlist';

const GENRE_OPTIONS = ['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Thriller', 'Romance', 'Horror', 'Animation'];

const GENRE_STATS = [
  { genre: 'Sci-Fi', percent: 85, color: Colors.genreTags.scifi },
  { genre: 'Thriller', percent: 70, color: Colors.genreTags.thriller },
  { genre: 'Action', percent: 55, color: Colors.genreTags.action },
  { genre: 'Comedy', percent: 40, color: Colors.genreTags.comedy },
  { genre: 'Drama', percent: 30, color: Colors.genreTags.drama },
];

interface StatCardProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  label: string;
  color: string;
}

function StatCard({ icon, value, label, color }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
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

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const preferences = usePreferenceStore((state) => state.preferences);
  const setPreferenceState = usePreferenceStore((state) => state.setPreferenceState);
  const hasSeenOnboarding = usePreferenceStore((state) => state.hasSeenOnboarding);
  const completedOnboarding = usePreferenceStore((state) => state.completedOnboarding);
  const watchlistCount = useWatchlistStore((state) => state.movieIds.length);
  const seenCount = usePersonalizationFeedbackStore((state) => state.seenMovieIds.length);
  const [events, setEvents] = useState<Array<AnalyticsEvent<AnalyticsEventName>>>([]);
  const [experimentVariant, setExperimentVariant] = useState<string>('not assigned');
  const [editingGenres, setEditingGenres] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(preferences.genres);
  const [savingGenres, setSavingGenres] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void getTrackedEvents().then((buffer) => {
      if (!isMounted) return;
      setEvents(buffer);
    });

    void getExperimentVariant('home_personalization_ranking').then((variant) => {
      if (!isMounted) return;
      setExperimentVariant(variant || 'not assigned');
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const weeklyMetrics = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weeklyEvents = events.filter((event) => Date.parse(event.timestamp) >= sevenDaysAgo);
    const eventSource = (event: AnalyticsEvent<AnalyticsEventName>) =>
      (event.payload as { source?: string }).source;

    const searches = weeklyEvents.filter((event) => event.name === 'search_submit').length;
    const detailFromSearch = weeklyEvents.filter(
      (event) => event.name === 'movie_open' && eventSource(event) === 'search'
    ).length;
    const detailFromCineBot = weeklyEvents.filter(
      (event) => event.name === 'movie_open' && eventSource(event) === 'cinebot'
    ).length;
    const watchlistFromDetail = weeklyEvents.filter(
      (event) => event.name === 'watchlist_add' && eventSource(event) === 'detail'
    ).length;
    const trailerTaps = weeklyEvents.filter((event) => event.name === 'trailer_tap').length;
    const feedbackActions = weeklyEvents.filter((event) => event.name === 'movie_feedback').length;
    const cinebotPrompts = weeklyEvents.filter((event) => event.name === 'cinebot_message_sent').length;

    const safePercent = (numerator: number, denominator: number) => {
      if (denominator <= 0) return '0%';
      return `${Math.round((numerator / denominator) * 100)}%`;
    };

    return {
      searches,
      detailFromSearch,
      detailFromCineBot,
      watchlistFromDetail,
      trailerTaps,
      feedbackActions,
      cinebotPrompts,
      searchToDetailRate: safePercent(detailFromSearch, searches),
      detailToWatchlistRate: safePercent(watchlistFromDetail, Math.max(detailFromSearch, 1)),
      cinebotToMovieRate: safePercent(detailFromCineBot, cinebotPrompts),
    };
  }, [events]);

  const genresValue = preferences.genres.length > 0 ? preferences.genres.join(', ') : 'Not set';
  const languagesValue = preferences.languages.length > 0 ? preferences.languages.join(', ') : 'Not set';
  const platformsValue = preferences.platforms.length > 0 ? preferences.platforms.join(', ') : 'Not set';

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((item) => item !== genre) : [...prev, genre]
    );
  };

  const startGenreEdit = () => {
    setSelectedGenres(preferences.genres);
    setEditingGenres(true);
  };

  const cancelGenreEdit = () => {
    setSelectedGenres(preferences.genres);
    setEditingGenres(false);
  };

  const saveGenreEdit = async () => {
    if (selectedGenres.length === 0) return;

    setSavingGenres(true);
    try {
      const nextState = await updatePreferences({
        ...preferences,
        genres: selectedGenres,
      });
      setPreferenceState(nextState);
      setEditingGenres(false);
    } catch (error) {
      console.error('Failed to save genres:', error);
    } finally {
      setSavingGenres(false);
    }
  };

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.backdrop}>
        <LinearGradient colors={[Colors.primaryMuted, 'transparent']} style={styles.backdropTop} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 92 }}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}> 
          <IconButton icon="bookmark-outline" label="Open watchlist" onPress={() => router.push('/watchlist')} />
          <IconButton icon="settings-outline" label="Open onboarding settings" onPress={() => router.push('/onboarding' as any)} />
        </View>

        <View style={styles.titleWrap}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Your taste, your vibe, your cinema</Text>
        </View>

        {hasSeenOnboarding && !completedOnboarding && (
          <Animated.View entering={FadeInDown.delay(80)} style={styles.promptCard}>
            <View style={styles.promptInfo}>
              <Text style={styles.promptTitle}>Finish your onboarding profile</Text>
              <Text style={styles.promptSubtitle}>Get better Home picks and smarter CineBot suggestions.</Text>
            </View>
            <Pressable style={styles.promptButton} onPress={() => router.push('/onboarding' as any)}>
              <Text style={styles.promptButtonText}>Complete</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Profile Card */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.profileCard}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>A</Text>
          </LinearGradient>
          <Text style={styles.profileName}>Movie Enthusiast</Text>
          <Text style={styles.profileEmail}>user@cinematch.app</Text>
          <Text style={styles.memberSince}>Member since April 2026</Text>
        </Animated.View>

        {/* Stats Row */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.statsRow}>
          <StatCard icon="star" value={String(seenCount)} label="Seen" color={Colors.ratingGold} />
          <StatCard icon="bookmark" value={String(watchlistCount)} label="Watchlist" color={Colors.primary} />
          <StatCard icon="chatbubble" value={String(weeklyMetrics.cinebotPrompts)} label="Bot Chats" color={Colors.cinebot} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260)} style={styles.section}>
          <View style={styles.kpiHeaderRow}>
            <Text style={styles.sectionTitle}>Weekly KPI Snapshot</Text>
            <View style={styles.kpiLiveBadge}>
              <View style={styles.kpiLiveDot} />
              <Text style={styles.kpiLiveText}>Last 7 days</Text>
            </View>
          </View>

          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{weeklyMetrics.searchToDetailRate}</Text>
              <Text style={styles.kpiLabel}>Search to detail</Text>
              <Text style={styles.kpiMeta}>{weeklyMetrics.detailFromSearch}/{weeklyMetrics.searches}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{weeklyMetrics.detailToWatchlistRate}</Text>
              <Text style={styles.kpiLabel}>Detail to save</Text>
              <Text style={styles.kpiMeta}>{weeklyMetrics.watchlistFromDetail} saves</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{weeklyMetrics.cinebotToMovieRate}</Text>
              <Text style={styles.kpiLabel}>CineBot to movie</Text>
              <Text style={styles.kpiMeta}>{weeklyMetrics.detailFromCineBot}/{weeklyMetrics.cinebotPrompts}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{weeklyMetrics.trailerTaps}</Text>
              <Text style={styles.kpiLabel}>Trailer taps</Text>
              <Text style={styles.kpiMeta}>{weeklyMetrics.feedbackActions} feedback actions</Text>
            </View>
          </View>

          <View style={styles.experimentCard}>
            <View style={styles.experimentMeta}>
              <Text style={styles.experimentLabel}>Optimization Experiment</Text>
              <Text style={styles.experimentValue}>home_personalization_ranking</Text>
            </View>
            <View style={styles.experimentStatusPill}>
              <Text style={styles.experimentStatusText}>{experimentVariant}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Top Genres */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
          <Text style={styles.sectionTitle}>Your Top Genres</Text>
          <View style={styles.genreList}>
            {GENRE_STATS.map(({ genre, percent, color }) => (
              <View key={genre} style={styles.genreRow}>
                <Text style={styles.genreLabel}>{genre}</Text>
                <View style={styles.genreBarTrack}>
                  <View style={[styles.genreBarFill, { width: `${percent}%`, backgroundColor: color }]} />
                </View>
                <Text style={styles.genrePercent}>{percent}%</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Settings */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <Pressable
            style={({ pressed }) => [styles.settingsRow, pressed && styles.settingsRowPressed]}
            onPress={startGenreEdit}
            accessibilityRole="button"
            accessibilityLabel="Edit genres"
          >
            <Ionicons name="film-outline" size={20} color={Colors.textSecondary} />
            <View style={styles.settingsInfo}>
              <Text style={styles.settingsLabel}>Edit Genres</Text>
              <Text style={styles.settingsValue}>{genresValue}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </Pressable>

          {editingGenres && (
            <View style={styles.genreEditorWrap}>
              <Text style={styles.genreEditorTitle}>Pick your genres</Text>
              <View style={styles.genreChipWrap}>
                {GENRE_OPTIONS.map((genre) => {
                  const selected = selectedGenres.includes(genre);
                  return (
                    <Pressable
                      key={genre}
                      onPress={() => toggleGenre(genre)}
                      style={({ pressed }) => [
                        styles.genreChip,
                        selected && styles.genreChipSelected,
                        pressed && styles.genreChipPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Toggle genre ${genre}`}
                    >
                      <Text style={[styles.genreChipText, selected && styles.genreChipTextSelected]}>{genre}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.genreEditorActions}>
                <Pressable
                  onPress={cancelGenreEdit}
                  style={({ pressed }) => [styles.genreCancelButton, pressed && styles.genreCancelButtonPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel genre changes"
                >
                  <Text style={styles.genreCancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={saveGenreEdit}
                  disabled={savingGenres || selectedGenres.length === 0}
                  style={({ pressed }) => [
                    styles.genreSaveButton,
                    (savingGenres || selectedGenres.length === 0) && styles.genreSaveButtonDisabled,
                    pressed && !savingGenres && selectedGenres.length > 0 && styles.genreSaveButtonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Save genre changes"
                >
                  <Text style={styles.genreSaveButtonText}>{savingGenres ? 'Saving...' : 'Save'}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {[
            { icon: 'language-outline', label: 'Languages', value: languagesValue },
            { icon: 'tv-outline', label: 'Platforms', value: platformsValue },
            { icon: 'moon-outline', label: 'Dark Mode', value: 'On' },
            { icon: 'notifications-outline', label: 'Notifications', value: 'On' },
          ].map(({ icon, label, value }) => (
            <Pressable key={label} style={({ pressed }) => [styles.settingsRow, pressed && styles.settingsRowPressed]}>
              <Ionicons name={icon as any} size={20} color={Colors.textSecondary} />
              <View style={styles.settingsInfo}>
                <Text style={styles.settingsLabel}>{label}</Text>
                <Text style={styles.settingsValue}>{value}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
            </Pressable>
          ))}
        </Animated.View>

        {/* Logout */}
        <Animated.View entering={FadeInDown.delay(500)} style={styles.logoutSection}>
          <Pressable style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={18} color={Colors.error} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </Pressable>
          <Text style={styles.version}>CineMatch v1.0.0</Text>
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropTop: {
    position: 'absolute',
    top: -200,
    left: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.3,
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
    backgroundColor: Colors.surfaceDim,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  titleWrap: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
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
  promptCard: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceDim,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  promptInfo: {
    flex: 1,
  },
  promptTitle: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  promptSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
  },
  promptButton: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptButtonText: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '700',
  },

  // ── Profile Card ─────────────────────────
  profileCard: {
    alignItems: 'center',
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surfaceDim,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textInverse,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  profileEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  memberSince: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 4,
  },

  // ── Stats ────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceDim,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 6,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // ── Sections ─────────────────────────────
  section: {
    marginHorizontal: Spacing.base,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.base,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surfaceDim,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  kpiLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  kpiLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.success,
  },
  kpiLiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    width: '48%',
    minHeight: 94,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
    padding: 12,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  kpiLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  kpiMeta: {
    marginTop: 4,
    fontSize: 11,
    color: Colors.textTertiary,
  },
  experimentCard: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  experimentMeta: {
    flex: 1,
  },
  experimentLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  experimentValue: {
    marginTop: 3,
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  experimentStatusPill: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  experimentStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.rosePale,
    textTransform: 'uppercase',
  },

  // ── Genre Stats ──────────────────────────
  genreList: {
    gap: 12,
  },
  genreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  genreLabel: {
    width: 60,
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  genreBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  genreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  genrePercent: {
    width: 35,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'right',
  },

  // ── Settings Rows ────────────────────────
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.divider,
  },
  settingsRowPressed: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
  },
  settingsInfo: {
    flex: 1,
  },
  settingsLabel: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  settingsValue: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  genreEditorWrap: {
    marginTop: 10,
    marginBottom: 8,
    padding: 12,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 10,
  },
  genreEditorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  genreChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    minHeight: 34,
    paddingHorizontal: 11,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreChipSelected: {
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryMuted,
  },
  genreChipPressed: {
    opacity: 0.86,
  },
  genreChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  genreChipTextSelected: {
    color: Colors.rosePale,
  },
  genreEditorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  genreCancelButton: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreCancelButtonPressed: {
    opacity: 0.86,
  },
  genreCancelButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  genreSaveButton: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreSaveButtonDisabled: {
    opacity: 0.5,
  },
  genreSaveButtonPressed: {
    opacity: 0.88,
  },
  genreSaveButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textPrimary,
  },

  // ── Logout ───────────────────────────────
  logoutSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.error + '40',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.error,
  },
  version: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: Spacing.md,
  },
});

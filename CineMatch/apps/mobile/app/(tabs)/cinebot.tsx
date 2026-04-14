import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Spacing, BorderRadius } from '@/theme';
import { backendApi, cinebotApi, tmdbApi, type CineBotRecommendation, type Movie } from '@/services/api';
import { trackEvent } from '@/services/analytics';
import { feedbackSelection, feedbackSuccess } from '@/services/feedback';
import { useAppStatusStore } from '@/stores/appStatus';
import { usePersonalizationFeedbackStore } from '@/stores/personalizationFeedback';
import { usePreferenceStore } from '@/stores/preferences';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendations?: Recommendation[];
  timestamp: Date;
}

interface Recommendation {
  title: string;
  year: number;
  genres: string[];
  imdb_rating: number;
  reason: string;
  poster_url?: string;
  movie_id?: number;
}

interface FollowUpAction {
  label: string;
  prompt: string;
}

interface PersistedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendations?: Recommendation[];
  timestamp: string;
}

type BotStatus = 'ready' | 'thinking' | 'error';

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function toImageSource(url?: string) {
  return url ? { uri: url } : require('../../assets/images/icon.png');
}

const DEFAULT_SUGGESTIONS = [
  { label: 'Horror in Hindi', prompt: 'Fun horror in Hindi' },
  { label: 'Like Inception', prompt: 'Something like Inception' },
  { label: 'Family movie', prompt: 'Family movie under 2 hours' },
  { label: 'Sci-fi tonight', prompt: 'Best sci-fi for tonight' },
  { label: 'Light comedy', prompt: 'Light comedy for tonight' },
  { label: 'Award winners', prompt: 'Award-winning dramas' },
];

const GUIDED_INTENT_CHIPS: Array<{ label: string; prompt: string }> = [
  { label: 'Date night', prompt: 'Recommend a romantic date night movie with great chemistry' },
  { label: 'Family', prompt: 'Recommend a family-friendly movie for all ages' },
  { label: 'Mind-bending', prompt: 'Recommend a mind-bending movie like Inception' },
  { label: 'Hindi comedy', prompt: 'Recommend a fun Hindi comedy for tonight' },
  { label: 'Underrated', prompt: 'Recommend an underrated hidden-gem movie' },
];

const CINEBOT_SESSION_KEY = 'cinebot:session:v1';

async function enrichRecommendations(recs: CineBotRecommendation[]): Promise<Recommendation[]> {
  const enriched = await Promise.all(
    recs.slice(0, 3).map(async (rec) => {
      try {
        const matches = await tmdbApi.search(rec.title);
        const best = matches.find((m) => m.title.toLowerCase() === rec.title.toLowerCase()) || matches[0];
        return {
          ...rec,
          year: rec.year || best?.year || 0,
          genres: rec.genres?.length ? rec.genres : (best?.genres || []),
          imdb_rating: rec.imdb_rating || best?.vote_average || 0,
          poster_url: best?.poster_url ?? undefined,
          movie_id: best?.id,
        };
      } catch {
        return {
          ...rec,
          poster_url: undefined,
          movie_id: undefined,
        };
      }
    })
  );

  return enriched;
}

// ── Chat Bubble ─────────────────────────────────
function ChatBubble({ message, index }: { message: Message; index: number }) {
  const isUser = message.role === 'user';

  return (
    <Animated.View
      entering={FadeInUp.delay(80 + index * 35).springify()}
      style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowBot]}
    >
      {!isUser && (
        <View style={styles.botAvatar}>
          <LinearGradient
            colors={[Colors.cinebot, Colors.cinebotGradientEnd]}
            style={styles.botAvatarGradient}
          >
            <Ionicons name="sparkles" size={14} color={Colors.textPrimary} />
          </LinearGradient>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
        {isUser ? (
          <LinearGradient
            colors={[Colors.primary, Colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bubbleUserGradient}
          >
            <Text style={styles.bubbleTextUser}>
              {message.content}
            </Text>
            <Text style={styles.bubbleMetaUser}>
              {formatTime(message.timestamp)}
            </Text>
          </LinearGradient>
        ) : (
          <>
            <Text style={styles.bubbleTextBot}>
              {message.content}
            </Text>
            <Text style={styles.bubbleMetaBot}>
              {formatTime(message.timestamp)}
            </Text>
          </>
        )}
      </View>
    </Animated.View>
  );
}

function FollowUpActions({ actions, onSelect }: { actions: FollowUpAction[]; onSelect: (prompt: string) => void }) {
  if (actions.length === 0) return null;

  return (
    <View style={styles.followUpWrap}>
      <Text style={styles.followUpTitle}>Quick follow-up</Text>
      <View style={styles.followUpChips}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => onSelect(action.prompt)}
            style={({ pressed }) => [styles.followUpChip, pressed && styles.followUpChipPressed]}
          >
            <Text style={styles.followUpChipText}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ── Recommendation Card (inline) ────────────────
function RecommendationCard({ rec, index }: { rec: Recommendation; index: number }) {
  const [selectedFeedbackAction, setSelectedFeedbackAction] = useState<
    'not_interested' | 'more_like_this' | 'seen_already' | null
  >(null);
  const markNotInterested = usePersonalizationFeedbackStore((state) => state.markNotInterested);
  const markSeen = usePersonalizationFeedbackStore((state) => state.markSeen);
  const markMoreLike = usePersonalizationFeedbackStore((state) => state.markMoreLike);

  const trustFacts = [
    rec.genres[0] ? `Genre match: ${rec.genres[0]}` : null,
    Number.isFinite(rec.imdb_rating) ? `Rating signal: ${rec.imdb_rating.toFixed(1)}/10` : null,
    rec.year ? `Release: ${rec.year}` : null,
  ].filter(Boolean) as string[];

  const submitFeedback = async (action: 'not_interested' | 'more_like_this' | 'seen_already') => {
    if (!rec.movie_id) return;

    await feedbackSelection();

    if (action === 'not_interested') {
      await markNotInterested({ id: rec.movie_id });
    } else if (action === 'seen_already') {
      await markSeen({ id: rec.movie_id });
    } else {
      await markMoreLike({ id: rec.movie_id, genres: rec.genres || [] });
    }

    await feedbackSuccess();
    setSelectedFeedbackAction(action);
    void trackEvent('movie_feedback', {
      movieId: rec.movie_id,
      action,
      source: 'cinebot',
    });
  };

  return (
    <Animated.View entering={SlideInRight.delay(index * 150).springify()}>
      <View style={styles.recCardWrap}>
        <Pressable
          style={({ pressed }) => [
            styles.recCard,
            pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
          ]}
          onPress={() => {
            if (!rec.movie_id) return;
            void trackEvent('movie_open', { movieId: rec.movie_id, source: 'cinebot' });
            router.push(`/movie/${rec.movie_id}`);
          }}
        >
          {rec.poster_url && (
            <Image
              source={toImageSource(rec.poster_url)}
              style={styles.recPoster}
              contentFit="cover"
              transition={300}
            />
          )}
          <View style={styles.recInfo}>
            <Text style={styles.recTitle} numberOfLines={1}>{rec.title}</Text>
            <View style={styles.recMeta}>
              <Text style={styles.recYear}>{rec.year}</Text>
              <View style={styles.recDot} />
              <View style={styles.recRating}>
                <Ionicons name="star" size={11} color={Colors.ratingGold} />
                <Text style={styles.recRatingText}>{rec.imdb_rating?.toFixed(1)}</Text>
              </View>
            </View>
            <View style={styles.recGenres}>
              {rec.genres.slice(0, 2).map(g => (
                <View key={g} style={styles.recGenreChip}>
                  <Text style={styles.recGenreText}>{g}</Text>
                </View>
              ))}
            </View>
            <View style={styles.trustPanel}>
              <Text style={styles.trustTitle}>Why this pick</Text>
              <Text style={styles.recReason} numberOfLines={2}>{rec.reason}</Text>
              {trustFacts.slice(0, 2).map((fact) => (
                <View key={fact} style={styles.trustFactRow}>
                  <Ionicons name="checkmark-circle-outline" size={12} color={Colors.tertiaryLight} />
                  <Text style={styles.trustFactText}>{fact}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.recArrow}>
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </View>
        </Pressable>

        {!!rec.movie_id && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.feedbackRow}
            style={styles.recFeedbackWrap}
          >
            <Pressable
              onPress={() => submitFeedback('not_interested')}
              style={({ pressed }) => [
                styles.feedbackChip,
                selectedFeedbackAction === 'not_interested' && styles.feedbackChipActive,
                pressed && styles.feedbackChipPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Not interested in ${rec.title}`}
            >
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
              accessibilityLabel={`Show more like ${rec.title}`}
            >
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
              accessibilityLabel={`Mark ${rec.title} as seen`}
            >
              <Text style={styles.feedbackChipText}>Seen</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </Animated.View>
  );
}

// ── Typing Indicator ────────────────────────────
function TypingDot({ delay = 0 }: { delay?: number }) {
  const opacity = useSharedValue(0.35);

  React.useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 360, easing: Easing.out(Easing.quad) }),
          withTiming(0.35, { duration: 360, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      )
    );
  }, [delay, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: 0.8 + opacity.value * 0.2 }],
  }));

  return <Animated.View style={[styles.typingDot, animatedStyle]} />;
}

function TypingIndicator() {
  return (
    <Animated.View entering={FadeIn} style={[styles.bubbleRow, styles.bubbleRowBot]}>
      <View style={styles.botAvatar}>
        <LinearGradient
          colors={[Colors.cinebot, Colors.cinebotGradientEnd]}
          style={styles.botAvatarGradient}
        >
          <Ionicons name="sparkles" size={14} color={Colors.textPrimary} />
        </LinearGradient>
      </View>
      <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
        <View style={styles.typingDots}>
          <TypingDot delay={0} />
          <TypingDot delay={120} />
          <TypingDot delay={240} />
        </View>
      </View>
    </Animated.View>
  );
}

// ── CineBot Screen ──────────────────────────────
export default function CineBotScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const backendHealthy = useAppStatusStore((state) => state.backendHealthy);
  const setBackendHealth = useAppStatusStore((state) => state.setBackendHealth);
  const preferences = usePreferenceStore((state) => state.preferences);
  const completedOnboarding = usePreferenceStore((state) => state.completedOnboarding);
  const quickSuggestions = useMemo(() => {
    const dynamic: Array<{ label: string; prompt: string }> = [];

    if (preferences.genres[0] && preferences.languages[0]) {
      dynamic.push({
        label: `${preferences.genres[0]} in ${preferences.languages[0]}`,
        prompt: `Recommend a ${preferences.genres[0]} movie in ${preferences.languages[0]}`,
      });
    }
    if (preferences.moods[0]) {
      dynamic.push({
        label: `${preferences.moods[0]} pick`,
        prompt: `Give me a ${preferences.moods[0]} movie for tonight`,
      });
    }
    if (preferences.platforms[0]) {
      dynamic.push({
        label: `${preferences.platforms[0]} only`,
        prompt: `Recommend something great available on ${preferences.platforms[0]}`,
      });
    }

    return [...dynamic, ...DEFAULT_SUGGESTIONS].slice(0, 6);
  }, [preferences.genres, preferences.languages, preferences.moods, preferences.platforms]);

  const guidedIntents = useMemo(() => {
    const platformPrompt = preferences.platforms[0]
      ? {
          label: `${preferences.platforms[0]} picks`,
          prompt: `Recommend great movies available on ${preferences.platforms[0]}`,
        }
      : null;

    return [
      ...GUIDED_INTENT_CHIPS,
      ...(platformPrompt ? [platformPrompt] : []),
    ].slice(0, 6);
  }, [preferences.platforms]);

  const welcomeMessage = useMemo(() => {
    if (!completedOnboarding) {
      return "Hey! I'm CineBot, your AI movie companion. Tell me what you're in the mood for, and I'll find the perfect movie.";
    }

    const genre = preferences.genres[0] || 'movie';
    const language = preferences.languages[0] || 'your preferred language';
    return `Hey! I tuned myself to your taste. Want a ${genre} pick in ${language}, or something completely new?`;
  }, [completedOnboarding, preferences.genres, preferences.languages]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hey! I'm CineBot, your AI movie companion. Tell me what you're in the mood for, and I'll find the perfect movie.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [status, setStatus] = useState<BotStatus>('ready');
  const [lastPrompt, setLastPrompt] = useState('');

  useEffect(() => {
    let isMounted = true;
    void backendApi.healthCheck().then((result) => {
      if (!isMounted) return;
      setBackendHealth(result.healthy);
    });

    return () => {
      isMounted = false;
    };
  }, [setBackendHealth]);
  const [inputFocused, setInputFocused] = useState(false);
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const buildFollowUps = useCallback((message: Message): FollowUpAction[] => {
    const firstRec = message.recommendations?.[0];
    const platform = preferences.platforms[0];

    const actions: FollowUpAction[] = [];
    if (firstRec?.title) {
      actions.push({
        label: 'More like this',
        prompt: `Recommend more movies like ${firstRec.title}`,
      });
    }
    actions.push({
      label: platform ? `Only on ${platform}` : 'Only on one platform',
      prompt: platform
        ? `Recommend movies only on ${platform}`
        : 'Recommend movies available on one popular streaming platform',
    });
    actions.push({
      label: 'Under 2 hours',
      prompt: 'Recommend movies under 2 hours that are highly rated',
    });

    return actions;
  }, [preferences.platforms]);

  useEffect(() => {
    const hydrateSession = async () => {
      try {
        const raw = await AsyncStorage.getItem(CINEBOT_SESSION_KEY);
        if (!raw) {
          setSessionHydrated(true);
          return;
        }

        const parsed = JSON.parse(raw) as PersistedMessage[];
        if (!Array.isArray(parsed) || parsed.length === 0) {
          setSessionHydrated(true);
          return;
        }

        const restored: Message[] = parsed
          .filter((entry) => entry?.id && entry?.role && entry?.content && entry?.timestamp)
          .map((entry) => ({
            ...entry,
            timestamp: new Date(entry.timestamp),
          }));

        if (restored.length > 0) {
          setMessages(restored);
          const lastUser = [...restored].reverse().find((entry) => entry.role === 'user');
          setLastPrompt(lastUser?.content || '');
        }
      } catch {
        // Ignore persistence hydration failures.
      } finally {
        setSessionHydrated(true);
      }
    };

    void hydrateSession();
  }, []);

  useEffect(() => {
    if (!sessionHydrated) return;

    const persist = async () => {
      const payload: PersistedMessage[] = messages.map((message) => ({
        ...message,
        timestamp: message.timestamp.toISOString(),
      }));
      await AsyncStorage.setItem(CINEBOT_SESSION_KEY, JSON.stringify(payload));
    };

    void persist();
  }, [messages, sessionHydrated]);

  useEffect(() => {
    if (!sessionHydrated) return;
    setMessages((prev) => {
      if (prev.length !== 1 || prev[0]?.id !== '1') return prev;
      return [{ ...prev[0], content: welcomeMessage }];
    });
  }, [sessionHydrated, welcomeMessage]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    const cleanText = text.trim();
    await Haptics.selectionAsync().catch(() => null);
    void trackEvent('cinebot_message_sent', {
      messageLength: cleanText.length,
      fromQuickSuggestion: quickSuggestions.some((entry) => entry.prompt === cleanText),
    });

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: cleanText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setStatus('thinking');
    setLastPrompt(cleanText);

    if (backendHealthy === false) {
      const offlineMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'CineBot is temporarily offline. Please try again in a moment.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, offlineMessage]);
      setStatus('error');
      setIsTyping(false);
      return;
    }

    // Scroll to bottom
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
      const bot = await cinebotApi.chat({
        message: cleanText,
        history,
        user_preferences: {
          genres: preferences.genres,
          languages: preferences.languages,
          platforms: preferences.platforms,
          moods: preferences.moods,
        },
      });
      const recommendations = await enrichRecommendations(bot.recommendations || []);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: bot.reply || 'Here are some picks you might enjoy.',
        recommendations,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
      setStatus('ready');
    } catch (error) {
      console.error('CineBot chat failed, falling back to local picks:', error);

      try {
        const localCandidates = await tmdbApi.search(cleanText, {
          genres: preferences.genres.length ? preferences.genres : undefined,
        });
        const fallbackRecommendations: Recommendation[] = localCandidates.slice(0, 3).map((movie) => ({
          title: movie.title,
          year: movie.year,
          genres: movie.genres,
          imdb_rating: movie.vote_average,
          reason: 'Picked from local discovery while CineBot reconnects.',
          poster_url: movie.poster_url || undefined,
          movie_id: movie.id,
        }));

        const fallbackMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: fallbackRecommendations.length
            ? 'I had a brief connection issue, but I found these picks for you while reconnecting.'
            : 'I could not reach the recommendation service right now. Tap retry, or use a quick intent chip.',
          recommendations: fallbackRecommendations,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, fallbackMessage]);
        setStatus(fallbackRecommendations.length ? 'ready' : 'error');
      } catch (fallbackError) {
        console.error('CineBot fallback failed:', fallbackError);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => null);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I could not reach the recommendation service. Tap retry, or use a quick intent chip to continue with a simpler request.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
        setStatus('error');
      }
    } finally {
      setIsTyping(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [backendHealthy, messages, preferences.genres, preferences.languages, preferences.moods, preferences.platforms, quickSuggestions]);

  const clearChat = useCallback(() => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date(),
      },
    ]);
    setStatus('ready');
    setLastPrompt('');
  }, [welcomeMessage]);

  const retryLastPrompt = useCallback(() => {
    if (!lastPrompt) return;
    sendMessage(lastPrompt);
  }, [lastPrompt, sendMessage]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Ambient backdrop glow */}
      <View pointerEvents="none" style={styles.backdrop}>
        <LinearGradient
          colors={['rgba(99,46,46,0.18)', 'transparent']}
          style={styles.backdropGlowTop}
        />
        <LinearGradient
          colors={['rgba(140,94,88,0.15)', 'transparent']}
          style={styles.backdropGlowBottom}
        />
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={[Colors.cinebot, Colors.cinebotGradientEnd]}
            style={styles.headerAvatar}
          >
            <Ionicons name="sparkles" size={16} color={Colors.textPrimary} />
          </LinearGradient>
          <View>
            <Text style={styles.headerTitle}>CineBot</Text>
            <View style={styles.headerMetaRow}>
              <View
                style={[
                  styles.onlineDot,
                  status === 'error' && styles.onlineDotError,
                  status === 'thinking' && styles.onlineDotThinking,
                ]}
              />
              <Text style={styles.headerSubtitle}>
                {status === 'thinking'
                  ? 'Thinking...'
                  : status === 'error'
                    ? 'Connection issue'
                    : 'Online · AI movie companion'}
              </Text>
            </View>
          </View>
        </View>
        <Pressable
          onPress={clearChat}
          style={({ pressed }) => [styles.clearButton, pressed && styles.clearButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="New chat"
        >
          <Ionicons name="add-circle-outline" size={16} color={Colors.rosePink} />
          <Text style={styles.clearButtonText}>New chat</Text>
        </Pressable>
      </View>

      {backendHealthy === false && (
        <View style={styles.warningBar}>
          <Ionicons name="cloud-offline-outline" size={14} color={Colors.warning} />
          <Text style={styles.warningText}>Backend unavailable. Showing offline-safe mode.</Text>
        </View>
      )}

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={[styles.messageContent, { paddingBottom: tabBarHeight + 86 }]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg, idx) => (
          <View key={msg.id}>
            <ChatBubble message={msg} index={idx} />
            {msg.recommendations && msg.recommendations.length > 0 && (
              <View style={styles.recsContainer}>
                {msg.recommendations.map((rec, recIdx) => (
                  <RecommendationCard key={rec.title} rec={rec} index={recIdx} />
                ))}
                {msg.role === 'assistant' && (
                  <FollowUpActions actions={buildFollowUps(msg)} onSelect={sendMessage} />
                )}
              </View>
            )}
          </View>
        ))}
        {isTyping && <TypingIndicator />}

        {status === 'error' && !!lastPrompt && (
          <Animated.View entering={FadeInDown.delay(120)} style={styles.retryWrap}>
            <Text style={styles.retryText}>Trouble connecting to CineBot.</Text>
            <Pressable
              onPress={retryLastPrompt}
              style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
            >
              <Ionicons name="refresh" size={14} color={Colors.rosePink} />
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Quick Suggestions (only at start) */}
        {messages.length <= 1 && (
          <Animated.View entering={FadeInDown.delay(400)} style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Guided intents</Text>
            <View style={styles.suggestionsList}>
              {guidedIntents.map((suggestion, sIdx) => (
                <Animated.View key={`intent-${suggestion.label}`} entering={FadeInDown.delay(110 + sIdx * 50)}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.suggestionChip,
                      pressed && styles.suggestionChipPressed,
                    ]}
                    onPress={() => sendMessage(suggestion.prompt)}
                  >
                    <Text style={styles.suggestionText}>{suggestion.label}</Text>
                  </Pressable>
                </Animated.View>
              ))}
            </View>

            <Text style={styles.suggestionsTitle}>Try asking</Text>
            <View style={styles.suggestionsList}>
              {quickSuggestions.map((suggestion, sIdx) => (
                <Animated.View key={suggestion.label} entering={FadeInDown.delay(130 + sIdx * 60)}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.suggestionChip,
                      pressed && styles.suggestionChipPressed,
                    ]}
                    onPress={() => sendMessage(suggestion.prompt)}
                  >
                    <Text style={styles.suggestionText}>{suggestion.label}</Text>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, Spacing.sm), marginBottom: Math.max(tabBarHeight - insets.bottom, 56) }]}>
        <View style={[styles.inputFieldWrap, inputFocused && styles.inputFieldWrapFocused]}>
          <TextInput
            style={styles.inputField}
            placeholder="Ask CineBot anything..."
            placeholderTextColor={Colors.textTertiary}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => sendMessage(input)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            returnKeyType="send"
            multiline
            maxLength={500}
          />
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            !input.trim() && styles.sendButtonDisabled,
            pressed && input.trim() && styles.sendButtonPressed,
          ]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim()}
        >
          <LinearGradient
            colors={input.trim() ? [Colors.primary, Colors.primaryLight] : [Colors.surface, Colors.surface]}
            style={styles.sendButtonGradient}
          >
            <Ionicons
              name="send"
              size={17}
              color={input.trim() ? Colors.textPrimary : Colors.textTertiary}
            />
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  backdropGlowTop: {
    position: 'absolute',
    top: -250,
    right: -150,
    width: 420,
    height: 420,
    borderRadius: 200,
    opacity: 0.5,
  },
  backdropGlowBottom: {
    position: 'absolute',
    bottom: -230,
    left: -180,
    width: 430,
    height: 430,
    borderRadius: 220,
    opacity: 0.45,
  },

  // ── Header ───────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(60,60,60,0.5)',
    backgroundColor: Colors.background,
  },
  warningBar: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceDim,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 0,
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.success,
  },
  onlineDotThinking: {
    backgroundColor: Colors.warning,
  },
  onlineDotError: {
    backgroundColor: Colors.error,
  },
  clearButton: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
    backgroundColor: 'rgba(99,46,46,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    marginTop: 2,
  },
  clearButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.rosePink,
  },

  // ── Messages ─────────────────────────────
  messageList: {
    flex: 1,
  },
  messageContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base + 4,
    paddingBottom: Spacing.xl + 6,
  },

  // ── Bubbles ──────────────────────────────
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    alignItems: 'flex-end',
    gap: 8,
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowBot: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 28,
    height: 28,
    marginBottom: 2,
  },
  botAvatarGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  bubbleUser: {
    borderBottomRightRadius: 6,
  },
  bubbleBot: {
    backgroundColor: Colors.surfaceDim,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(140,94,88,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  bubbleUserGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleTextUser: {
    fontSize: 15,
    lineHeight: 23,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  bubbleTextBot: {
    fontSize: 15,
    lineHeight: 23,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  bubbleMetaBot: {
    fontSize: 10,
    marginTop: 6,
    color: Colors.textTertiary,
  },
  bubbleMetaUser: {
    fontSize: 10,
    marginTop: 6,
    color: 'rgba(245,245,245,0.7)',
    textAlign: 'right',
  },

  // ── Typing ───────────────────────────────
  typingBubble: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 5,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.rosePink,
  },

  // ── Recommendation Cards ─────────────────
  recsContainer: {
    marginLeft: 36,
    gap: 12,
    marginBottom: Spacing.md,
  },
  recCardWrap: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(140,94,88,0.15)',
    backgroundColor: Colors.surfaceDim,
    overflow: 'hidden',
  },
  recCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  recPoster: {
    width: 78,
    height: 116,
  },
  recInfo: {
    flex: 1,
    paddingHorizontal: Spacing.sm + 2,
    paddingTop: Spacing.sm + 1,
    paddingBottom: Spacing.sm,
  },
  recTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  recMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  recYear: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  recDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.textTertiary,
  },
  recRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  recRatingText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.ratingGold,
  },
  recGenres: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 5,
  },
  recGenreChip: {
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  recGenreText: {
    fontSize: 10,
    color: Colors.rosePale,
    fontWeight: '600',
  },
  recReason: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  trustPanel: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(140,94,88,0.2)',
    gap: 4,
  },
  trustTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.rosePale,
    letterSpacing: 0.2,
  },
  trustFactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustFactText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  recFeedbackWrap: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(140,94,88,0.16)',
    backgroundColor: 'rgba(0,0,0,0.16)',
  },
  feedbackRow: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedbackChip: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  feedbackChipActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primaryLight,
  },
  feedbackChipPressed: {
    opacity: 0.88,
  },
  feedbackChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.rosePale,
  },
  recArrow: {
    paddingRight: 8,
    paddingTop: 10,
  },

  followUpWrap: {
    marginTop: 2,
    marginBottom: 6,
  },
  followUpTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  followUpChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  followUpChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  followUpChipPressed: {
    opacity: 0.86,
  },
  followUpChipText: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '600',
  },

  // ── Suggestions ──────────────────────────
  suggestionsContainer: {
    marginTop: Spacing.xl,
  },
  suggestionsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    letterSpacing: 0.2,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceDim,
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
  },
  suggestionChipPressed: {
    backgroundColor: Colors.primaryMuted,
    transform: [{ scale: 0.97 }],
  },
  suggestionText: {
    fontSize: 14,
    color: Colors.rosePale,
    fontWeight: '500',
  },
  retryWrap: {
    marginLeft: 36,
    marginBottom: Spacing.md,
    marginTop: -4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  retryText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  retryButton: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  retryButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.rosePink,
  },

  // ── Input Bar ────────────────────────────
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(60,60,60,0.5)',
    backgroundColor: Colors.background,
  },
  inputFieldWrap: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(140,94,88,0.2)',
    backgroundColor: Colors.surfaceDim,
    overflow: 'hidden',
  },
  inputFieldWrapFocused: {
    borderColor: Colors.primary,
    backgroundColor: '#242427',
  },
  inputField: {
    fontSize: 15,
    color: Colors.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 100,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
});

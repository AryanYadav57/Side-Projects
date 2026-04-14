import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BorderRadius, Colors, Spacing } from '@/theme';
import {
  completeOnboarding,
  savePreferenceDraft,
  skipOnboarding,
  type MoodPreference,
  type PlatformPreference,
} from '@/services/preferences';
import { trackEvent } from '@/services/analytics';
import { usePreferenceStore } from '@/stores/preferences';

const LANGUAGE_OPTIONS = ['English', 'Hindi', 'Tamil', 'Telugu', 'Korean', 'Japanese'];
const GENRE_OPTIONS = ['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Thriller', 'Romance', 'Horror', 'Animation'];
const MOOD_OPTIONS: MoodPreference[] = [
  'Feel-good',
  'Mind-bending',
  'Thrilling',
  'Emotional',
  'Family time',
  'Date night',
];
const PLATFORM_OPTIONS: PlatformPreference[] = [
  'Netflix',
  'Prime Video',
  'Disney+ Hotstar',
  'JioCinema',
  'SonyLIV',
  'ZEE5',
];

const STEPS = [
  { key: 'languages', title: 'Which languages do you watch most?', subtitle: 'Pick up to 3 to personalize your feed.' },
  { key: 'genres', title: 'What genres match your vibe?', subtitle: 'Choose at least 2 for stronger recommendations.' },
  { key: 'moods', title: 'What moods do you usually watch for?', subtitle: 'This helps CineBot suggest better picks.' },
  { key: 'platforms', title: 'Where do you usually stream?', subtitle: 'We will prioritize movies available there.' },
] as const;

function MultiSelectChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.chipPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const setPreferenceState = usePreferenceStore((state) => state.setPreferenceState);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [languages, setLanguages] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [moods, setMoods] = useState<MoodPreference[]>([]);
  const [platforms, setPlatforms] = useState<PlatformPreference[]>([]);

  const progress = useMemo(() => `${step + 1} / ${STEPS.length}`, [step]);

  const toggleString = (current: string[], value: string, max = 99) => {
    if (current.includes(value)) return current.filter((item) => item !== value);
    if (current.length >= max) return current;
    return [...current, value];
  };

  const goNext = async () => {
    if (step < STEPS.length - 1) {
      setStep((prev) => prev + 1);
      return;
    }

    setSaving(true);
    try {
      const nextState = await completeOnboarding({
        languages,
        genres,
        moods,
        platforms,
      });
      setPreferenceState(nextState);
      void trackEvent('app_open', { source: 'resume' });
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Onboarding save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      const draft = {
        languages,
        genres,
        moods,
        platforms,
      };
      await savePreferenceDraft(draft);
      const nextState = await skipOnboarding();
      setPreferenceState(nextState);
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Onboarding skip failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const canContinue = (() => {
    if (step === 0) return languages.length > 0;
    if (step === 1) return genres.length > 0;
    if (step === 2) return moods.length > 0;
    if (step === 3) return platforms.length > 0;
    return true;
  })();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.progress}>{progress}</Text>
          <Pressable onPress={handleSkip} accessibilityRole="button" accessibilityLabel="Skip onboarding">
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>{STEPS[step].title}</Text>
        <Text style={styles.subtitle}>{STEPS[step].subtitle}</Text>

        <View style={styles.chipsWrap}>
          {step === 0 &&
            LANGUAGE_OPTIONS.map((label) => (
              <MultiSelectChip
                key={label}
                label={label}
                selected={languages.includes(label)}
                onPress={() => setLanguages((prev) => toggleString(prev, label, 3))}
              />
            ))}

          {step === 1 &&
            GENRE_OPTIONS.map((label) => (
              <MultiSelectChip
                key={label}
                label={label}
                selected={genres.includes(label)}
                onPress={() => setGenres((prev) => toggleString(prev, label))}
              />
            ))}

          {step === 2 &&
            MOOD_OPTIONS.map((label) => (
              <MultiSelectChip
                key={label}
                label={label}
                selected={moods.includes(label)}
                onPress={() =>
                  setMoods((prev) =>
                    prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
                  )
                }
              />
            ))}

          {step === 3 &&
            PLATFORM_OPTIONS.map((label) => (
              <MultiSelectChip
                key={label}
                label={label}
                selected={platforms.includes(label)}
                onPress={() =>
                  setPlatforms((prev) =>
                    prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
                  )
                }
              />
            ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.base) }]}> 
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed, step === 0 && styles.backButtonDisabled]}
          onPress={() => setStep((prev) => Math.max(0, prev - 1))}
          disabled={step === 0}
        >
          <Ionicons name="arrow-back" size={16} color={step === 0 ? Colors.textTertiary : Colors.textSecondary} />
          <Text style={[styles.backButtonText, step === 0 && styles.backButtonTextDisabled]}>Back</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.nextButton,
            (!canContinue || saving) && styles.nextButtonDisabled,
            pressed && canContinue && !saving && styles.nextButtonPressed,
          ]}
          onPress={goNext}
          disabled={!canContinue || saving}
        >
          <Text style={styles.nextButtonText}>
            {step === STEPS.length - 1 ? (saving ? 'Saving...' : 'Finish') : 'Continue'}
          </Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.textPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.base,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  progress: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.rosePink,
    letterSpacing: 1,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  title: {
    fontSize: 34,
    lineHeight: 38,
    color: Colors.textPrimary,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceDim,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryLight,
  },
  chipPressed: {
    opacity: 0.88,
  },
  chipText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: Colors.rosePale,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.background,
  },
  backButton: {
    minHeight: 46,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceDim,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  backButtonDisabled: {
    opacity: 0.5,
  },
  backButtonPressed: {
    opacity: 0.88,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  backButtonTextDisabled: {
    color: Colors.textTertiary,
  },
  nextButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonPressed: {
    opacity: 0.88,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});

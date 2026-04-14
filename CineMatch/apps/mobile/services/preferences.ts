import AsyncStorage from '@react-native-async-storage/async-storage';

import { usersApi } from './api';

const PREFERENCES_KEY = 'user:preferences:v1';

export type PlatformPreference =
  | 'Netflix'
  | 'Prime Video'
  | 'Disney+ Hotstar'
  | 'JioCinema'
  | 'SonyLIV'
  | 'ZEE5';

export type MoodPreference =
  | 'Feel-good'
  | 'Mind-bending'
  | 'Thrilling'
  | 'Emotional'
  | 'Family time'
  | 'Date night';

export interface UserPreferences {
  languages: string[];
  genres: string[];
  moods: MoodPreference[];
  platforms: PlatformPreference[];
}

export interface PreferenceState {
  hasSeenOnboarding: boolean;
  completedOnboarding: boolean;
  skippedOnboarding: boolean;
  updatedAt: string;
  preferences: UserPreferences;
}

const EMPTY_PREFS: UserPreferences = {
  languages: [],
  genres: [],
  moods: [],
  platforms: [],
};

export const DEFAULT_PREFERENCE_STATE: PreferenceState = {
  hasSeenOnboarding: false,
  completedOnboarding: false,
  skippedOnboarding: false,
  updatedAt: new Date(0).toISOString(),
  preferences: EMPTY_PREFS,
};

export async function getPreferenceState(): Promise<PreferenceState> {
  try {
    const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
    if (!raw) return DEFAULT_PREFERENCE_STATE;

    const parsed = JSON.parse(raw) as Partial<PreferenceState>;
    return {
      hasSeenOnboarding: !!parsed.hasSeenOnboarding,
      completedOnboarding: !!parsed.completedOnboarding,
      skippedOnboarding: !!parsed.skippedOnboarding,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      preferences: {
        languages: parsed.preferences?.languages || [],
        genres: parsed.preferences?.genres || [],
        moods: (parsed.preferences?.moods || []) as MoodPreference[],
        platforms: (parsed.preferences?.platforms || []) as PlatformPreference[],
      },
    };
  } catch {
    return DEFAULT_PREFERENCE_STATE;
  }
}

async function persistPreferenceState(next: PreferenceState): Promise<void> {
  await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
}

export async function completeOnboarding(preferences: UserPreferences): Promise<PreferenceState> {
  const next: PreferenceState = {
    hasSeenOnboarding: true,
    completedOnboarding: true,
    skippedOnboarding: false,
    updatedAt: new Date().toISOString(),
    preferences,
  };
  await persistPreferenceState(next);

  void usersApi.savePreferences({
    genres: preferences.genres,
    languages: preferences.languages,
    platforms: preferences.platforms,
    viewing_frequency: 'often',
    preferred_runtime: null,
    watching_with: preferences.moods.join(', '),
  });

  return next;
}

export async function skipOnboarding(): Promise<PreferenceState> {
  const previous = await getPreferenceState();
  const next: PreferenceState = {
    ...previous,
    hasSeenOnboarding: true,
    completedOnboarding: false,
    skippedOnboarding: true,
    updatedAt: new Date().toISOString(),
  };
  await persistPreferenceState(next);
  return next;
}

export async function savePreferenceDraft(preferences: UserPreferences): Promise<PreferenceState> {
  const previous = await getPreferenceState();
  const next: PreferenceState = {
    ...previous,
    preferences,
    updatedAt: new Date().toISOString(),
  };
  await persistPreferenceState(next);
  return next;
}

export async function updatePreferences(preferences: UserPreferences): Promise<PreferenceState> {
  const next = await savePreferenceDraft(preferences);

  void usersApi.savePreferences({
    genres: preferences.genres,
    languages: preferences.languages,
    platforms: preferences.platforms,
    viewing_frequency: 'often',
    preferred_runtime: null,
    watching_with: preferences.moods.join(', '),
  });

  return next;
}

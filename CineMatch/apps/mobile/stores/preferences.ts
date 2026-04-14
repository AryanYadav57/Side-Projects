import { create } from 'zustand';

import {
  DEFAULT_PREFERENCE_STATE,
  type PreferenceState,
  type UserPreferences,
} from '@/services/preferences';

interface PreferenceStoreState extends PreferenceState {
  hydrated: boolean;
  setHydrated: (hydrated: boolean) => void;
  setPreferenceState: (state: PreferenceState) => void;
  setPreferencesOnly: (preferences: UserPreferences) => void;
}

export const usePreferenceStore = create<PreferenceStoreState>((set) => ({
  ...DEFAULT_PREFERENCE_STATE,
  hydrated: false,
  setHydrated: (hydrated: boolean) => set({ hydrated }),
  setPreferenceState: (state: PreferenceState) => set({ ...state, hydrated: true }),
  setPreferencesOnly: (preferences: UserPreferences) => set({ preferences }),
}));

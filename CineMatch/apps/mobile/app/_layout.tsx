import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import 'react-native-reanimated';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';

import { CineMatchTheme, Colors } from '@/theme';
import { trackEvent } from '@/services/analytics';
import { backendApi } from '@/services/api';
import { useAppStatusStore } from '@/stores/appStatus';
import { getPreferenceState } from '@/services/preferences';
import { usePreferenceStore } from '@/stores/preferences';
import { useWatchlistStore } from '@/stores/watchlist';
import { usePersonalizationFeedbackStore } from '@/stores/personalizationFeedback';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const setBackendHealth = useAppStatusStore((state) => state.setBackendHealth);
  const hasSeenOnboarding = usePreferenceStore((state) => state.hasSeenOnboarding);
  const preferencesHydrated = usePreferenceStore((state) => state.hydrated);
  const setPreferenceState = usePreferenceStore((state) => state.setPreferenceState);
  const setPreferenceHydrated = usePreferenceStore((state) => state.setHydrated);
  const hydrateWatchlist = useWatchlistStore((state) => state.hydrate);
  const hydrateFeedback = usePersonalizationFeedbackStore((state) => state.hydrate);

  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Manrope: Manrope_400Regular,
    'Manrope-Medium': Manrope_500Medium,
    'Manrope-SemiBold': Manrope_600SemiBold,
    'Manrope-Bold': Manrope_700Bold,
    'Manrope-ExtraBold': Manrope_800ExtraBold,
    ...FontAwesome.font,
    ...Ionicons.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();

      void trackEvent('app_open', { source: 'startup' });
      void backendApi.healthCheck().then((result) => {
        setBackendHealth(result.healthy);
      });

      void hydrateWatchlist();
      void hydrateFeedback();

      void getPreferenceState().then((state) => {
        setPreferenceState(state);
      }).finally(() => {
        setPreferenceHydrated(true);
      });
    }
  }, [hydrateFeedback, hydrateWatchlist, loaded, setBackendHealth, setPreferenceHydrated, setPreferenceState]);

  useEffect(() => {
    if (!loaded || !preferencesHydrated) return;

    const inOnboarding = String(segments[0] || '') === 'onboarding';
    if (!hasSeenOnboarding && !inOnboarding) {
      router.replace('/onboarding' as any);
    }
  }, [hasSeenOnboarding, loaded, preferencesHydrated, router, segments]);

  if (!loaded) {
    return null;
  }

  return (
    <PaperProvider theme={CineMatchTheme}>
      <StatusBar style="light" backgroundColor={Colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="onboarding"
          options={{
            animation: 'slide_from_right',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="movie/[id]"
          options={{
            animation: 'slide_from_bottom',
            presentation: 'card',
          }}
        />
      </Stack>
    </PaperProvider>
  );
}

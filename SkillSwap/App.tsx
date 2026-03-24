import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import StackNavigator from './navigation/StackNavigator';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { COLORS } from './styles/globalStyles';
import { BookmarksProvider } from './context/BookmarksContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { AuthProvider } from './context/AuthContext';

// A wrapper block to inject the navigation theme
const AppContainer = () => {
  const { isDark } = useTheme();

  const baseTheme = isDark ? DarkTheme : DefaultTheme;

  const MyTheme = {
    ...baseTheme,
    dark: isDark,
    colors: {
      ...baseTheme.colors,
      primary: COLORS.primary,
      background: isDark ? COLORS.dark.background : COLORS.light.background,
      card: isDark ? COLORS.dark.card : COLORS.light.card,
      text: isDark ? COLORS.dark.text : COLORS.light.text,
      border: isDark ? COLORS.dark.border : COLORS.light.border,
      notification: COLORS.warning,
    },
  };

  return (
    <NavigationContainer theme={MyTheme}>
      <StackNavigator />
    </NavigationContainer>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BookmarksProvider>
          <NotificationsProvider>
            <AppContainer />
          </NotificationsProvider>
        </BookmarksProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;


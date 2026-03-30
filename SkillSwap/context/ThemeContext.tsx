import React, {createContext, useState, useContext, useEffect} from 'react';
import {useColorScheme} from 'react-native';

export type ThemeType = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeType;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  isDark: false,
});

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const systemTheme = useColorScheme();
  // Default to dark for the glass UI; user can toggle in Settings
  const [theme, setTheme] = useState<ThemeType>('dark');

  useEffect(() => {
    if (systemTheme) {
      setTheme(systemTheme === 'dark' ? 'dark' : 'light');
    }
  }, [systemTheme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{theme, toggleTheme, isDark: theme === 'dark'}}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

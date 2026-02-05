import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Colors {
  icon: string;
  iconActive: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  inputBackground: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;
  primary: string;
  primaryDark: string;
  error: string;
  success: string;
  card: string;
}

interface Theme {
  colors: Colors;
  isDark: boolean;
}

const lightTheme: Theme = {
  isDark: false,
  colors: {
    icon: '#8E8E93',
    iconActive: '#007AFF',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#E0E0E0',
    inputBackground: '#F8F8F8',
    inputBorder: '#E0E0E0',
    inputText: '#000000',
    inputPlaceholder: '#999999',
    primary: '#007AFF',
    primaryDark: '#0051D5',
    error: '#FF3B30',
    success: '#34C759',
    card: '#FFFFFF',
  },
};

const darkTheme: Theme = {
  isDark: true,
  colors: {
    icon: '#8E8E93',
    iconActive: '#0A84FF',
    background: '#121212',
    surface: '#1C1C1E',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    border: '#38383A',
    inputBackground: '#1C1C1E',
    inputBorder: '#38383A',
    inputText: '#FFFFFF',
    inputPlaceholder: '#8E8E93',
    primary: '#0A84FF',
    primaryDark: '#0051D5',
    error: '#FF453A',
    success: '#32D74B',
    card: '#1C1C1E',
  },
};

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextType extends Theme {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  ...darkTheme,
  themeMode: 'system',
  setThemeMode: async () => {},
});

const THEME_STORAGE_KEY = '@app_theme_mode';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);

  // Load theme mode from storage
  useEffect(() => {
    const loadThemeMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode && (savedMode === 'system' || savedMode === 'light' || savedMode === 'dark')) {
          setThemeModeState(savedMode as ThemeMode);
        }
      } catch (error) {
        console.error('Error loading theme mode:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadThemeMode();
  }, []);

  // Determine actual theme based on mode
  const getActualTheme = (): Theme => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? darkTheme : lightTheme;
    }
    return themeMode === 'dark' ? darkTheme : lightTheme;
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Error saving theme mode:', error);
    }
  };

  const currentTheme = getActualTheme();

  // Don't render until theme is loaded
  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ ...currentTheme, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};


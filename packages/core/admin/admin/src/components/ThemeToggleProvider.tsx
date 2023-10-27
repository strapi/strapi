import * as React from 'react';

import { DefaultTheme } from 'styled-components';

import { ThemeToggleContextProvider, ThemeName, NonSystemThemeName } from '../contexts/themeToggle';

const THEME_KEY = 'STRAPI_THEME';

const getDefaultTheme = () => {
  const persistedTheme = localStorage.getItem(THEME_KEY) as ThemeName | null;

  return persistedTheme || 'system';
};

interface ThemeToggleProviderProps {
  children: React.ReactNode;
  themes: {
    light: DefaultTheme;
    dark: DefaultTheme;
  };
}

const ThemeToggleProvider = ({ children, themes }: ThemeToggleProviderProps) => {
  const [currentTheme, setCurrentTheme] = React.useState<ThemeName>(getDefaultTheme());
  const [systemTheme, setSystemTheme] = React.useState<NonSystemThemeName>();

  const handleChangeTheme = React.useCallback(
    (nextTheme: ThemeName) => {
      setCurrentTheme(nextTheme);
      localStorage.setItem(THEME_KEY, nextTheme);
    },
    [setCurrentTheme]
  );

  // Listen to changes in the system theme
  React.useEffect(() => {
    const themeWatcher = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemTheme(themeWatcher.matches ? 'dark' : 'light');

    const listener = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };
    themeWatcher.addEventListener('change', listener);

    // Remove listener on cleanup
    return () => {
      themeWatcher.removeEventListener('change', listener);
    };
  }, []);

  return (
    <ThemeToggleContextProvider
      currentTheme={currentTheme}
      onChangeTheme={handleChangeTheme}
      themes={themes}
      systemTheme={systemTheme}
    >
      {children}
    </ThemeToggleContextProvider>
  );
};

export { ThemeToggleProvider };
export type { ThemeToggleProviderProps };

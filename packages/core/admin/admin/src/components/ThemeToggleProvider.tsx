import * as React from 'react';

import { DefaultTheme } from 'styled-components';

import { ThemeToggleContext, ThemeName } from '../contexts/themeToggle';

const THEME_KEY = 'STRAPI_THEME';

const getDefaultTheme = () => {
  const browserTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const persistedTheme = localStorage.getItem(THEME_KEY) as ThemeName | null;

  if (!persistedTheme) {
    localStorage.setItem(THEME_KEY, browserTheme);
  }

  return persistedTheme || browserTheme;
};

interface ThemeToggleProviderProps {
  children: React.ReactNode;
  themes: {
    light: DefaultTheme;
    dark: DefaultTheme;
  };
}

const ThemeToggleProvider = ({ children, themes }: ThemeToggleProviderProps) => {
  const [currentTheme, setCurrentTheme] = React.useState(getDefaultTheme());

  const handleChangeTheme = React.useCallback(
    (nextTheme: ThemeName) => {
      setCurrentTheme(nextTheme);
      localStorage.setItem(THEME_KEY, nextTheme);
    },
    [setCurrentTheme]
  );

  const themeValues = React.useMemo(() => {
    return {
      currentTheme,
      onChangeTheme: handleChangeTheme,
      themes,
    };
  }, [currentTheme, handleChangeTheme, themes]);

  return <ThemeToggleContext.Provider value={themeValues}>{children}</ThemeToggleContext.Provider>;
};

export { ThemeToggleProvider };

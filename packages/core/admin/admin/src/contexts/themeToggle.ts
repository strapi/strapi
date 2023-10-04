import { createContext } from 'react';

import { StrapiTheme } from '@strapi/design-system';

type ThemeName = 'light' | 'dark';

interface ThemeToggleContextContextValue {
  currentTheme?: ThemeName;
  onChangeTheme?: (nextTheme: ThemeName) => void;
  themes?: {
    dark: StrapiTheme;
    light: StrapiTheme;
  };
}

export const ThemeToggleContext = createContext<ThemeToggleContextContextValue>({
  currentTheme: undefined,
  themes: undefined,
});

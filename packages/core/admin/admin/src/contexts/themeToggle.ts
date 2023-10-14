import { createContext } from 'react';

import { DefaultTheme } from 'styled-components';

export type ThemeName = 'light' | 'dark';

interface ThemeToggleContextContextValue {
  currentTheme?: ThemeName;
  onChangeTheme?: (nextTheme: ThemeName) => void;
  themes?: {
    dark: DefaultTheme;
    light: DefaultTheme;
  };
}

export const ThemeToggleContext = createContext<ThemeToggleContextContextValue>({});

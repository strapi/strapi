import { createContext } from 'react';

import { DefaultTheme } from 'styled-components';

export type ThemeName = 'light' | 'dark' | 'system';
export type NonSystemThemeName = Exclude<ThemeName, 'system'>;

interface ThemeToggleContextContextValue {
  currentTheme?: ThemeName;
  onChangeTheme?: (nextTheme: ThemeName) => void;
  themes?: {
    dark: DefaultTheme;
    light: DefaultTheme;
  };
  systemTheme?: NonSystemThemeName;
}

export const ThemeToggleContext = createContext<ThemeToggleContextContextValue>({});

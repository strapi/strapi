import { createContext } from '@radix-ui/react-context';
import { DefaultTheme } from 'styled-components';

type ThemeName = 'light' | 'dark' | 'system';
type NonSystemThemeName = Exclude<ThemeName, 'system'>;

export interface ThemeToggleContextContextValue {
  currentTheme?: ThemeName;
  onChangeTheme?: (nextTheme: ThemeName) => void;
  themes?: {
    dark: DefaultTheme;
    light: DefaultTheme;
  };
  systemTheme?: NonSystemThemeName;
}

const [ThemeToggleContextProvider, useThemeToggleContext] =
  createContext<ThemeToggleContextContextValue>('ThemeToggleContext');

const useThemeToggle = () => useThemeToggleContext('useThemeToggle');

export { ThemeToggleContextProvider, useThemeToggle };
export type { ThemeName, NonSystemThemeName, ThemeToggleContextContextValue };

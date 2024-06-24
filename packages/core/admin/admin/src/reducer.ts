import { createSlice } from '@reduxjs/toolkit';

import { PermissionMap } from './types/permissions';

import type { PayloadAction } from '@reduxjs/toolkit';

type ThemeName = 'light' | 'dark' | 'system';

interface AppState {
  language: {
    locale: string;
    localeNames: Record<string, string>;
  };
  permissions: Partial<PermissionMap>;
  theme: {
    currentTheme: ThemeName;
    availableThemes: string[];
  };
  token?: string | null;
}

const STORAGE_KEYS = {
  TOKEN: 'jwtToken',
  USER: 'userInfo',
};

const THEME_LOCAL_STORAGE_KEY = 'STRAPI_THEME';
const LANGUAGE_LOCAL_STORAGE_KEY = 'strapi-admin-language';

export const getStoredToken = (): string | null => {
  const token =
    localStorage.getItem(STORAGE_KEYS.TOKEN) ?? sessionStorage.getItem(STORAGE_KEYS.TOKEN);

  if (typeof token === 'string') {
    return JSON.parse(token);
  }

  return null;
};

const adminSlice = createSlice({
  name: 'admin',
  initialState: () => {
    return {
      language: {
        locale: 'en',
        localeNames: { en: 'English' },
      },
      permissions: {},
      theme: {
        availableThemes: [],
        currentTheme: localStorage.getItem(THEME_LOCAL_STORAGE_KEY) || 'system',
      },
      token: null,
    } as AppState;
  },
  reducers: {
    setAppTheme(state, action: PayloadAction<ThemeName>) {
      state.theme.currentTheme = action.payload;
      window.localStorage.setItem(THEME_LOCAL_STORAGE_KEY, action.payload);
    },
    setAvailableThemes(state, action: PayloadAction<AppState['theme']['availableThemes']>) {
      state.theme.availableThemes = action.payload;
    },
    setLocale(state, action: PayloadAction<string>) {
      state.language.locale = action.payload;

      window.localStorage.setItem(LANGUAGE_LOCAL_STORAGE_KEY, action.payload);
      document.documentElement.setAttribute('lang', action.payload);
    },
    setToken(state, action: PayloadAction<string | null>) {
      state.token = action.payload;
    },
    login(state, action: PayloadAction<{ token: string; persist?: boolean }>) {
      const { token, persist } = action.payload;

      if (!persist) {
        window.sessionStorage.setItem(STORAGE_KEYS.TOKEN, JSON.stringify(token));
      } else {
        window.localStorage.setItem(STORAGE_KEYS.TOKEN, JSON.stringify(token));
      }

      state.token = token;
    },
    logout(state) {
      state.token = null;
      window.localStorage.removeItem(STORAGE_KEYS.TOKEN);
      window.localStorage.removeItem(STORAGE_KEYS.USER);
      window.sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
      window.sessionStorage.removeItem(STORAGE_KEYS.USER);
    },
  },
});

const reducer = adminSlice.reducer;

export const { setAppTheme, setAvailableThemes, setLocale, setToken, logout, login } =
  adminSlice.actions;

export { reducer, THEME_LOCAL_STORAGE_KEY, LANGUAGE_LOCAL_STORAGE_KEY };
export type { AppState, ThemeName };

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
}

const THEME_LOCAL_STORAGE_KEY = 'STRAPI_THEME';
const LANGUAGE_LOCAL_STORAGE_KEY = 'strapi-admin-language';

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
    } as AppState;
  },
  reducers: {
    setAdminPermissions(state, action: PayloadAction<Partial<PermissionMap>>) {
      state.permissions = action.payload;
    },
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
  },
});

const reducer = adminSlice.reducer;

const { setAdminPermissions, setAppTheme, setAvailableThemes, setLocale } = adminSlice.actions;

export {
  reducer,
  setAdminPermissions,
  setAppTheme,
  setAvailableThemes,
  setLocale,
  THEME_LOCAL_STORAGE_KEY,
  LANGUAGE_LOCAL_STORAGE_KEY,
};
export type { AppState, ThemeName };

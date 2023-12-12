import { createSlice } from '@reduxjs/toolkit';

import { PermissionMap } from './types/permissions';

import type { PayloadAction } from '@reduxjs/toolkit';

type ThemeName = 'light' | 'dark' | 'system';

interface AppState {
  permissions: Partial<PermissionMap>;
  theme: {
    currentTheme: ThemeName;
    availableThemes: string[];
  };
}

const THEME_KEY = 'STRAPI_THEME';

const adminSlice = createSlice({
  name: 'admin',
  initialState: () => {
    return {
      permissions: {},
      theme: {
        availableThemes: [],
        currentTheme: localStorage.getItem(THEME_KEY) || 'system',
      },
    } as AppState;
  },
  reducers: {
    setAdminPermissions(state, action: PayloadAction<Partial<PermissionMap>>) {
      state.permissions = action.payload;
    },
    setAppTheme(state, action: PayloadAction<ThemeName>) {
      state.theme.currentTheme = action.payload;
      localStorage.setItem(THEME_KEY, action.payload);
    },
    setAvailableThemes(state, action: PayloadAction<AppState['theme']['availableThemes']>) {
      state.theme.availableThemes = action.payload;
    },
  },
});

const reducer = adminSlice.reducer;

const { setAdminPermissions, setAppTheme, setAvailableThemes } = adminSlice.actions;

export { reducer, setAdminPermissions, setAppTheme, setAvailableThemes };
export type { AppState };

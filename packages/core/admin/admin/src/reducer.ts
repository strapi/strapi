import { createSlice } from '@reduxjs/toolkit';

import { PermissionMap } from './types/permissions';

import type { PayloadAction } from '@reduxjs/toolkit';

interface AppState {
  permissions: Partial<PermissionMap>;
}

const adminSlice = createSlice({
  name: 'admin',
  initialState: {
    permissions: {},
  } as AppState,
  reducers: {
    setAdminPermissions(state, action: PayloadAction<Partial<PermissionMap>>) {
      state.permissions = action.payload;
    },
  },
});

const reducer = adminSlice.reducer;

const { setAdminPermissions } = adminSlice.actions;

export { reducer, setAdminPermissions };
export type { AppState };

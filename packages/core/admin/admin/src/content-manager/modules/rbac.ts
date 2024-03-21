import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { Permission } from '../../features/Auth';

interface SyncRbacState {
  permissions: Permission[] | undefined;
}

const initialState: SyncRbacState = {
  permissions: undefined,
};

const rbacSlice = createSlice({
  name: 'rbac',
  initialState,
  reducers: {
    setPermissions(
      state,
      action: PayloadAction<{
        permissions: Record<string, Permission[]>;
        __meta__?: {
          plugins?: object;
          containerName: string;
        };
      }>
    ) {
      state.permissions = Object.values(action.payload.permissions).reduce<
        NonNullable<SyncRbacState['permissions']>
      >((acc, current) => {
        return [...acc, ...current];
      }, []);
    },
    resetPermissions(state) {
      state.permissions = undefined;
    },
  },
});

const { actions, reducer } = rbacSlice;
const { setPermissions, resetPermissions } = actions;

export { reducer, setPermissions, resetPermissions };
export type { SyncRbacState };

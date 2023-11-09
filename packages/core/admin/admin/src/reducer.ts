import produce from 'immer';

import { ACTION_SET_APP_RUNTIME_STATUS, ACTION_SET_ADMIN_PERMISSIONS } from './constants';
import { PermissionMap } from './types/permissions';

interface State {
  status: 'init' | 'runtime';
  permissions: Partial<PermissionMap>;
}

const initialState = {
  permissions: {},
  status: 'init',
} satisfies State;

interface SetAppRuntimeStatusAction {
  type: typeof ACTION_SET_APP_RUNTIME_STATUS;
}

interface SetAdminPermissionsAction {
  type: typeof ACTION_SET_ADMIN_PERMISSIONS;
  payload: Record<string, unknown>;
}

type Action = SetAppRuntimeStatusAction | SetAdminPermissionsAction;

const reducer = (state: State = initialState, action: Action) =>
  /* eslint-disable-next-line consistent-return */
  produce(state, (draftState) => {
    switch (action.type) {
      case ACTION_SET_APP_RUNTIME_STATUS: {
        draftState.status = 'runtime';
        break;
      }

      case ACTION_SET_ADMIN_PERMISSIONS: {
        draftState.permissions = action.payload;
        break;
      }

      default:
        return draftState;
    }
  });

export { reducer, initialState };
export type { State, Action, SetAppRuntimeStatusAction, SetAdminPermissionsAction };

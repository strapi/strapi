import { useEffect } from 'react';

import { Permission } from '@strapi/helper-plugin';
import produce from 'immer';

import { useTypedDispatch, useTypedSelector } from '../../core/store/hooks';

import type { RBACState } from '../../components/RBACProvider';

/* -------------------------------------------------------------------------------------------------
 * useSyncRbac
 * -----------------------------------------------------------------------------------------------*/

const useSyncRbac = (
  query: { plugins?: object },
  collectionTypeUID: string,
  containerName = 'listView'
): {
  isValid: boolean;
  permissions: Permission[] | null;
} => {
  const dispatch = useTypedDispatch();

  const collectionTypesRelatedPermissions = useTypedSelector(
    (state) => state.rbacProvider.collectionTypesRelatedPermissions
  );
  const permissions = useTypedSelector((state) => state['content-manager_rbacManager'].permissions);

  const relatedPermissions = collectionTypesRelatedPermissions[collectionTypeUID];

  useEffect(() => {
    if (relatedPermissions) {
      dispatch({
        type: SET_PERMISSIONS,
        permissions: relatedPermissions,
        __meta__: {
          plugins: query ? query.plugins : null,
          containerName,
        },
      });

      return () => {
        dispatch({ type: RESET_PERMISSIONS });
      };
    }

    return () => {};
  }, [relatedPermissions, dispatch, query, containerName]);

  // Check if the permissions are related to the current collectionTypeUID
  const isPermissionMismatch =
    permissions?.some((permission) => permission.subject !== collectionTypeUID) ?? true;

  return {
    isValid: Boolean(permissions) && !isPermissionMismatch,
    permissions,
  };
};

/* -------------------------------------------------------------------------------------------------
 * Reducer
 * -----------------------------------------------------------------------------------------------*/

interface SyncRbacState {
  permissions: RBACState['collectionTypesRelatedPermissions'][string][string] | null;
}

const initialState = {
  permissions: null,
} satisfies SyncRbacState;

const SET_PERMISSIONS = 'ContentManager/RBACManager/SET_PERMISSIONS';
const RESET_PERMISSIONS = 'ContentManager/RBACManager/RESET_PERMISSIONS';

interface SetPermissionsAction {
  type: typeof SET_PERMISSIONS;
  permissions: RBACState['collectionTypesRelatedPermissions'][string];
  __meta__?: {
    plugins: object;
    containerName: string;
  };
}

interface ResetPermissionsAction {
  type: typeof RESET_PERMISSIONS;
}

type Action = SetPermissionsAction | ResetPermissionsAction;

const reducer = (state: SyncRbacState = initialState, action: Action) =>
  // eslint-disable-next-line consistent-return
  produce(state, (draftState) => {
    switch (action.type) {
      case SET_PERMISSIONS: {
        draftState.permissions = Object.entries(action.permissions).reduce<
          NonNullable<SyncRbacState['permissions']>
        >((acc, current) => {
          return [...acc, ...current[1]];
        }, []);
        break;
      }
      case RESET_PERMISSIONS: {
        draftState.permissions = null;
        break;
      }
      default:
        return draftState;
    }
  });

export { useSyncRbac, reducer };
export type { SyncRbacState, RBACState };

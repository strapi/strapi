import * as React from 'react';

import {
  LoadingIndicatorPage,
  Permission,
  RBACContext,
  RBACContextValue,
} from '@strapi/helper-plugin';
import produce from 'immer';

import { useTypedSelector, useTypedDispatch } from '../core/store/hooks';

/* -------------------------------------------------------------------------------------------------
 * RBACProvider
 * -----------------------------------------------------------------------------------------------*/

interface RBACProviderProps {
  children: React.ReactNode;
  permissions: Permission[];
  refetchPermissions: RBACContextValue['refetchPermissions'];
}

const RBACProvider = ({ children, permissions, refetchPermissions }: RBACProviderProps) => {
  const allPermissions = useTypedSelector((state) => state.rbacProvider.allPermissions);

  const dispatch = useTypedDispatch();

  React.useEffect(() => {
    dispatch(setPermissionsAction(permissions));

    return () => {
      dispatch(resetStoreAction());
    };
  }, [permissions, dispatch]);

  if (!allPermissions) {
    return <LoadingIndicatorPage />;
  }

  return (
    <RBACContext.Provider value={{ allPermissions, refetchPermissions }}>
      {children}
    </RBACContext.Provider>
  );
};

/* -------------------------------------------------------------------------------------------------
 * RBACReducer
 * -----------------------------------------------------------------------------------------------*/

interface RBACState {
  allPermissions: null | Permission[];
  collectionTypesRelatedPermissions: Record<string, Record<string, Permission[]>>;
}

const initialState = {
  allPermissions: null,
  collectionTypesRelatedPermissions: {},
};

const RESET_STORE = 'StrapiAdmin/RBACProvider/RESET_STORE';
const SET_PERMISSIONS = 'StrapiAdmin/RBACProvider/SET_PERMISSIONS';

interface ResetStoreAction {
  type: typeof RESET_STORE;
}

const resetStoreAction = (): ResetStoreAction => ({ type: RESET_STORE });

interface SetPermissionsAction {
  type: typeof SET_PERMISSIONS;
  permissions: Permission[];
}

const setPermissionsAction = (
  permissions: SetPermissionsAction['permissions']
): SetPermissionsAction => ({
  type: SET_PERMISSIONS,
  permissions,
});

type Actions = ResetStoreAction | SetPermissionsAction;

const RBACReducer = (state: RBACState = initialState, action: Actions) =>
  produce(state, (draftState) => {
    switch (action.type) {
      case SET_PERMISSIONS: {
        draftState.allPermissions = action.permissions;
        draftState.collectionTypesRelatedPermissions = action.permissions
          .filter((perm) => perm.subject)
          .reduce<Record<string, Record<string, Permission[]>>>((acc, current) => {
            const { subject, action } = current;

            if (!subject) return acc;

            if (!acc[subject]) {
              acc[subject] = {};
            }

            acc[subject] = acc[subject][action]
              ? { ...acc[subject], [action]: [...acc[subject][action], current] }
              : { ...acc[subject], [action]: [current] };

            return acc;
          }, {});
        break;
      }
      case RESET_STORE: {
        return initialState;
      }
      default:
        return state;
    }
  });

export { RBACProvider, RBACReducer, resetStoreAction, setPermissionsAction };
export type {
  RBACState,
  Actions,
  RBACProviderProps,
  ResetStoreAction,
  SetPermissionsAction,
  Permission,
};

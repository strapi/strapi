/* eslint-disable consistent-return */
import { produce } from 'immer';
import pull from 'lodash/pull';

import { ContentApiPermission } from '../../../../../../../shared/contracts/content-api/permissions';

import { ApiTokenPermissionsContextValue } from './apiTokenPermissions';
import { transformPermissionsData } from './utils/transformPermissionsData';

type InitialState = Pick<
  ApiTokenPermissionsContextValue['value'],
  'data' | 'routes' | 'selectedAction' | 'selectedActions'
>;

interface ActionOnChange {
  type: 'ON_CHANGE';
  value: string;
}

interface ActionSelectAllInPermission {
  type: 'SELECT_ALL_IN_PERMISSION';
  value: { action: string; actionId: string }[];
}

interface ActionSelectAllActions {
  type: 'SELECT_ALL_ACTIONS';
}

interface ActionOnChangeReadOnly {
  type: 'ON_CHANGE_READ_ONLY';
}

interface ActionUpdatePermissionsLayout {
  type: 'UPDATE_PERMISSIONS_LAYOUT';
  value: ContentApiPermission;
}

interface ActionUpdateRoutes {
  type: 'UPDATE_ROUTES';
  value: ApiTokenPermissionsContextValue['value']['routes'] | undefined;
}

interface ActionUpdatePermissions {
  type: 'UPDATE_PERMISSIONS';
  value: any[];
}

interface ActionSetSelectedAction {
  type: 'SET_SELECTED_ACTION';
  value: string;
}

type Action =
  | ActionOnChange
  | ActionSelectAllInPermission
  | ActionSelectAllActions
  | ActionOnChangeReadOnly
  | ActionUpdatePermissionsLayout
  | ActionUpdateRoutes
  | ActionUpdatePermissions
  | ActionSetSelectedAction;

export const initialState: InitialState = {
  data: {
    allActionsIds: [],
    permissions: [],
  },
  routes: {},
  selectedAction: '',
  selectedActions: [],
};

export const reducer = (state: InitialState, action: Action) =>
  produce(state, (draftState) => {
    switch (action.type) {
      case 'ON_CHANGE': {
        if (draftState.selectedActions.includes(action.value)) {
          pull(draftState.selectedActions, action.value);
        } else {
          draftState.selectedActions.push(action.value);
        }
        break;
      }
      case 'SELECT_ALL_IN_PERMISSION': {
        const areAllSelected = action.value.every((item) =>
          draftState.selectedActions.includes(item.actionId)
        );

        if (areAllSelected) {
          action.value.forEach((item) => {
            pull(draftState.selectedActions, item.actionId);
          });
        } else {
          action.value.forEach((item) => {
            draftState.selectedActions.push(item.actionId);
          });
        }
        break;
      }

      case 'SELECT_ALL_ACTIONS': {
        draftState.selectedActions = [...draftState.data.allActionsIds];

        break;
      }
      case 'ON_CHANGE_READ_ONLY': {
        const onlyReadOnlyActions = draftState.data.allActionsIds.filter(
          (actionId) => actionId.includes('find') || actionId.includes('findOne')
        );
        draftState.selectedActions = [...onlyReadOnlyActions];
        break;
      }
      case 'UPDATE_PERMISSIONS_LAYOUT': {
        draftState.data = transformPermissionsData(action.value);
        break;
      }
      case 'UPDATE_ROUTES': {
        draftState.routes = { ...action.value };
        break;
      }
      case 'UPDATE_PERMISSIONS': {
        draftState.selectedActions = [...action.value];
        break;
      }
      case 'SET_SELECTED_ACTION': {
        draftState.selectedAction = action.value;
        break;
      }
      default:
        return draftState;
    }
  });

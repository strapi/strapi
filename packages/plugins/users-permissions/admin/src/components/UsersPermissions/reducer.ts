/* eslint-disable consistent-return */
import { produce } from 'immer';
import get from 'lodash/get';
import set from 'lodash/set';
import take from 'lodash/take';

import type { Permissions, Routes, ControllerPermissions } from '../../types';

export type State = {
  initialData: Permissions;
  modifiedData: Permissions;
  routes: Routes;
  selectedAction: string;
  policies: string[];
};
export type Action =
  | { type: 'ON_CHANGE'; keys: string[]; value: string | boolean }
  | { type: 'ON_CHANGE_SELECT_ALL'; keys: string[]; value: boolean }
  | { type: 'ON_RESET' | 'ON_SUBMIT_SUCCEEDED' }
  | { type: 'SELECT_ACTION'; actionToSelect: string };

export const initialState: State = {
  initialData: {},
  modifiedData: {},
  routes: {},
  selectedAction: '',
  policies: [],
};

/** Applies permission edits while preserving saved values for reset. */
const reducer = (state: State, action: Action) =>
  produce(state, (draftState) => {
    switch (action.type) {
      case 'ON_CHANGE': {
        const keysLength = action.keys.length;
        const isChangingCheckbox = action.keys[keysLength - 1] === 'enabled';

        if (action.value && isChangingCheckbox) {
          const selectedAction = take(action.keys, keysLength - 1).join('.');
          draftState.selectedAction = selectedAction;
        }

        set(draftState, ['modifiedData', ...action.keys], action.value);
        break;
      }
      case 'ON_CHANGE_SELECT_ALL': {
        const pathToValue = ['modifiedData', ...action.keys];
        const oldValues: ControllerPermissions = get(state, pathToValue, {});
        const updatedValues = Object.keys(oldValues).reduce<ControllerPermissions>(
          (acc, current) => {
            acc[current] = { ...oldValues[current], enabled: action.value };

            return acc;
          },
          {}
        );

        set(draftState, pathToValue, updatedValues);

        break;
      }
      case 'ON_RESET': {
        draftState.modifiedData = state.initialData;
        break;
      }
      case 'ON_SUBMIT_SUCCEEDED': {
        draftState.initialData = state.modifiedData;
        break;
      }

      case 'SELECT_ACTION': {
        const { actionToSelect } = action;
        draftState.selectedAction = actionToSelect === state.selectedAction ? '' : actionToSelect;
        break;
      }
      default:
        return draftState;
    }
  });

export { reducer };

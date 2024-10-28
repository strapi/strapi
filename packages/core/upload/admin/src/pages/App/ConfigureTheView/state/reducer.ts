import { produce } from 'immer'; // current
import get from 'lodash/get';
import set from 'lodash/set';

import { ON_CHANGE, SET_LOADED } from './actionTypes';
import { init, initialState } from './init';

import type { InitialState } from './init';

export interface ActionOnChange {
  type: string;
  keys?: string;
  value: string | number;
}

export interface ActionSetLoaded {
  type: string;
}

interface ActionInitialValue {
  type: string;
}

export type Action = ActionSetLoaded | ActionOnChange | ActionInitialValue;

export const reducer = (
  state: InitialState = initialState,
  action: Action = {
    type: '',
  }
) =>
  // eslint-disable-next-line consistent-return
  produce(state, (draftState) => {
    switch (action.type) {
      case ON_CHANGE: {
        if ('keys' in action && 'value' in action && action.keys) {
          set(draftState, ['modifiedData', ...action.keys.split('.')], action.value);
        }
        break;
      }
      case SET_LOADED: {
        // This action re-initialises the state using the current modifiedData.
        const reInitialise = init(get(draftState, ['modifiedData'], {}));
        draftState.initialData = reInitialise.initialData;
        draftState.modifiedData = reInitialise.modifiedData;
        break;
      }
      default:
        return draftState;
    }
  });

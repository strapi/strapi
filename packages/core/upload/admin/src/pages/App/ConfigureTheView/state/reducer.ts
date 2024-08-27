import { produce } from 'immer'; // current
import get from 'lodash/get';
import set from 'lodash/set';

import { ON_CHANGE, SET_LOADED } from './actionTypes';
import { init, initialState } from './init';
import type { Configuration } from '../../../../../../shared/contracts/configuration';

interface OnChangeAction {
  keys: string;
  type: typeof ON_CHANGE;
  value: string;
}

interface SetLoadedAction {
  type: typeof SET_LOADED;
}

type Action = OnChangeAction | SetLoadedAction;

// eslint-disable-next-line default-param-last
const reducer = (state = initialState, action: Action) =>
  // eslint-disable-next-line consistent-return
  produce(state, (draftState) => {
    switch (action.type) {
      case ON_CHANGE: {
        if ('value' in action) {
          set(draftState, ['modifiedData', ...action.keys.split('.')], action.value);
        }
        break;
      }
      case SET_LOADED: {
        const getData = get(draftState, ['modifiedData'], {
          pageSize: 10,
          sort: 'createdAt:DESC',
        }) as Configuration;
        // This action re-initialises the state using the current modifiedData.
        const reInitialise = init(getData);
        draftState.initialData = reInitialise.initialData;
        draftState.modifiedData = reInitialise.modifiedData;
        break;
      }
      default:
        return draftState;
    }
  });

export default reducer;

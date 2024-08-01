import { produce } from 'immer';
import set from 'lodash/set';

import type { GetSettings } from '../../../../shared/contracts/settings';

type InitialState = {
  initialData: GetSettings.Response['data']['data'];
  modifiedData: GetSettings.Response['data']['data'];
};

const initialState: InitialState = {
  initialData: {
    responsiveDimensions: true,
    sizeOptimization: true,
    autoOrientation: false,
    videoPreview: false,
  },
  modifiedData: {
    responsiveDimensions: true,
    sizeOptimization: true,
    autoOrientation: false,
    videoPreview: false,
  },
};

export interface OnChangeAction {
  type: 'ON_CHANGE';
  keys: string;
  value: boolean;
}

export interface GetDataSucceededAction {
  type: 'GET_DATA_SUCCEEDED';
  data: GetSettings.Response['data']['data'];
}

type Action = GetDataSucceededAction | OnChangeAction;

const reducer = (state: InitialState, action: Action) =>
  // eslint-disable-next-line consistent-return
  produce(state, (drafState) => {
    switch (action.type) {
      case 'GET_DATA_SUCCEEDED': {
        drafState.initialData = action.data;
        drafState.modifiedData = action.data;
        break;
      }
      case 'ON_CHANGE': {
        set(drafState, ['modifiedData', ...action.keys.split('.')], action.value);
        break;
      }
      default:
        return state;
    }
  });

export default reducer;
export { initialState };

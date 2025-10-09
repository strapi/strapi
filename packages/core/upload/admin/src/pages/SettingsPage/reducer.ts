import { produce } from 'immer';
import set from 'lodash/set';

import { SettingsData } from '../../../../shared/contracts/settings';

const initialData: SettingsData = {
  responsiveDimensions: true,
  sizeOptimization: true,
  autoOrientation: false,
  videoPreview: false,
  aiMetadata: true,
};

export type InitialState = {
  initialData: SettingsData | null;
  modifiedData: SettingsData | null;
};

interface ActionGetDataSucceeded {
  type: 'GET_DATA_SUCCEEDED';
  data: InitialState['initialData'];
}

interface ActionOnChange {
  type: 'ON_CHANGE';
  keys: keyof NonNullable<InitialState['initialData']>;
  value: boolean;
}

export type Action = ActionGetDataSucceeded | ActionOnChange;

const initialState: InitialState = {
  initialData,
  modifiedData: { ...initialData },
};

const reducer = (state: InitialState, action: Action) =>
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

export { initialState, reducer };

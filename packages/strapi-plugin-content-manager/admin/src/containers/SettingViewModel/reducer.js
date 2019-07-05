/**
 *
 * settingViewModel reducer
 */

import { fromJS } from 'immutable';
import {
  GET_DATA_SUCCEEDED,
  ON_CHANGE,
  ON_RESET,
  SUBMIT_SUCCEEDED,
} from './constants';

export const initialState = fromJS({
  initialData: fromJS({}),
  modifiedData: fromJS({}),
  shouldToggleModalSubmit: true,
});

function settingViewModelReducer(state = initialState, action) {
  switch (action.type) {
    case GET_DATA_SUCCEEDED:
      return state
        .update('initialData', () => fromJS(action.layout))
        .update('modifiedData', () => fromJS(action.layout));
    case ON_CHANGE:
      return state.updateIn(action.keys, () => action.value);
    case ON_RESET:
      return state.update('modifiedData', () => state.get('initialData'));
    case SUBMIT_SUCCEEDED:
      return state
        .update('initialData', () => state.get('modifiedData'))
        .update('shouldToggleModalSubmit', v => !v);
    default:
      return state;
  }
}

export default settingViewModelReducer;

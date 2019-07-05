/**
 *
 * settingViewModel reducer
 */

import { fromJS, Map } from 'immutable';
import { GET_DATA_SUCCEEDED } from './constants';

export const initialState = fromJS({
  initialData: Map({}),
  modifiedData: Map({}),
});

function settingViewModelReducer(state = initialState, action) {
  switch (action.type) {
    case GET_DATA_SUCCEEDED:
      return state
        .update('initialData', () => Map(action.layout))
        .update('modifiedData', () => Map(action.layout));
    default:
      return state;
  }
}

export default settingViewModelReducer;

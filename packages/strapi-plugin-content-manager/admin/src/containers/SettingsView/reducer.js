/**
 *
 * settingsView reducer
 */

import { fromJS, Map } from 'immutable';
import {
  GET_DATA_SUCCEEDED,
  ON_CHANGE,
  ON_RESET,
  SUBMIT_SUCCEEDED,
} from './constants';

export const initialState = fromJS({
  initialData: Map({}),
  modifiedData: Map({}),
  isLoading: true,
  shouldToggleModalSubmit: true,
});

function settingsViewReducer(state = initialState, action) {
  switch (action.type) {
    case GET_DATA_SUCCEEDED:
      return state
        .update('initialData', () => Map(action.generalSettings))
        .update('modifiedData', () => Map(action.generalSettings))
        .update('isLoading', () => false);
    case ON_CHANGE:
      return state.updateIn(['modifiedData', action.name], () => action.value);
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

export default settingsViewReducer;

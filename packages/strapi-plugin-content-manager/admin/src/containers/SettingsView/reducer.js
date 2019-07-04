/**
 *
 * settingsView reducer
 */

import { fromJS, List, Map } from 'immutable';
import { GET_DATA_SUCCEEDED } from './constants';

export const initialState = fromJS({
  generalSettings: Map({}),
  groups: List([]),
  models: List([]),
  isLoading: true,
});

function settingsViewReducer(state = initialState, action) {
  switch (action.type) {
    case GET_DATA_SUCCEEDED:
      return state
        .update('generalSettings', () => Map(action.generalSettings))
        .update('groups', () => List(action.groups))
        .update('models', () => List(action.models))
        .update('isLoading', () => false);
    default:
      return state;
  }
}

export default settingsViewReducer;

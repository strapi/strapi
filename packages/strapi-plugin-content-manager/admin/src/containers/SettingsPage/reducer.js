/**
 * 
 * SettingsPage reducer
 */

import { fromJS } from 'immutable';

const initialState = fromJS({});

function settingsPageReducer(state = initialState, action) {
  switch (action.type) {
    default:
      return state;
  }
}

export default settingsPageReducer;
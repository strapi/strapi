/**
 * 
 * SettingPage reducer
 */

import { fromJS } from 'immutable';

const initialState = fromJS({});

function settingPageReducer(state = initialState, action) {
  switch (action.type) {
    default:
      return state;
  }
}

export default settingPageReducer;
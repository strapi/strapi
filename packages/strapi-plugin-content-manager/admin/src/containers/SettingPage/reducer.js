/**
 * 
 * SettingPage reducer
 */

import { fromJS } from 'immutable';
import { ON_CLICK_EDIT_LIST_ITEM } from './constants';

const initialState = fromJS({
  listItemToEdit: fromJS({}),
  indexListItemToEdit: 0,
});

function settingPageReducer(state = initialState, action) {
  switch (action.type) {
    case ON_CLICK_EDIT_LIST_ITEM:
      return state
        .update('listItemToEdit', () => fromJS(action.listItemToEdit));
    default:
      return state;
  }
}

export default settingPageReducer;
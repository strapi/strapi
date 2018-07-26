/**
 * 
 * SettingPage reducer
 */

import { fromJS } from 'immutable';
import {
  ON_CLICK_EDIT_FIELD,
  ON_CLICK_EDIT_LIST_ITEM,
  ON_CLICK_EDIT_RELATION,
} from './constants';

const initialState = fromJS({
  fieldToEdit: fromJS({}),
  listItemToEdit: fromJS({}),
  relationToEdit: fromJS({}),
});

function settingPageReducer(state = initialState, action) {
  switch (action.type) {
    case ON_CLICK_EDIT_FIELD: 
      return state
        .update('fieldToEdit', () => fromJS(action.fieldToEdit))
        .update('relationToEdit', () => fromJS({})); // Both these objects will be used to set the form in order to know which form needs to be displayed
    case ON_CLICK_EDIT_LIST_ITEM:
      return state.update('listItemToEdit', () => fromJS(action.listItemToEdit));
    case ON_CLICK_EDIT_RELATION:
      return state
        .update('fieldToEdit', () => fromJS({}))
        .update('relationToEdit', () => fromJS(action.relationToEdit));
    default:
      return state;
  }
}

export default settingPageReducer;
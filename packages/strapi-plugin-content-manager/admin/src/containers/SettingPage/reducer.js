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
  indexListItemToEdit: 0, // NOTE: need to check if this used in the code...
  listItemToEdit: fromJS({}),
  relationToEdit: fromJS({}),
});

function settingPageReducer(state = initialState, action) {
  switch (action.type) {
    case ON_CLICK_EDIT_FIELD: 
      return state
        .update('fieldToEdit', () => fromJS(action.fieldToEdit))
        .update('relationToEdit', () => fromJS({})); // Both these object will be used to set the form so in order to know which form to display we set an empty object
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
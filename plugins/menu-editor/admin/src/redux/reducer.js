import { fromJS, List } from 'immutable';

import {
  GET_MENU_SUCCEEDED,
  GET_MENU,
  ON_CANCEL,
  ON_CHANGE,
  //FIXME: no-unused-vars
  // eslint-disable-next-line no-unused-vars
  REDO,
  //FIXME: no-unused-vars
  // eslint-disable-next-line no-unused-vars
  UNDO,
} from './constants';

const initialState = fromJS({
  didCheckErrors: false,
  formErrors: List([]),
  menuItems: [],
  modifiedMenuItemsData: [],
});

function menuEditorReducer(state = initialState, action) {
  switch (action.type) {
    case GET_MENU:
      return state.update('isLoading', () => true);
    case GET_MENU_SUCCEEDED:
      return state
        .update('menuItems', () => action.menuItems)
        .update('isLoading', () => false);
    case ON_CANCEL:
      return state.update('modifiedMenuItemsData', () => []);
    case ON_CHANGE:
      return state.update(action.key, () => action.value);
    default:
      return state;
  }
}

export default menuEditorReducer;

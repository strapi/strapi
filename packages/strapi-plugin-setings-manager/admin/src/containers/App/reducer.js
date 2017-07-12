/*
 *
 * App reducer
 *
 */

import { fromJS, List } from 'immutable';
import {
  MENU_FETCH_SUCCEEDED,
} from './constants';

const initialState = fromJS({
  sections: List()
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case MENU_FETCH_SUCCEEDED:
      return state.set('menuSections', action.menu.sections);
    default:
      return state;
  }
}

export default appReducer;

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
  sections: List(), // eslint-disable-line new-cap
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case MENU_FETCH_SUCCEEDED:
      return state.set('sections', List(action.menu.sections)); // eslint-disable-line new-cap
    default:
      return state;
  }
}

export default appReducer;

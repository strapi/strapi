/*
 *
 * App reducer
 *
 */

import { fromJS, List } from 'immutable';
import {
  MENU_FETCH_SUCCEEDED,
  ENVIRONMENTS_FETCH_SUCCEEDED,
} from './constants';

/* eslint-disable new-cap */
const initialState = fromJS({
  sections: List(), // eslint-disable-line new-cap
  environments: List(),
  loading: true,
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case MENU_FETCH_SUCCEEDED:
      return state.set('sections', List(action.menu.sections)).set('loading', false);
    case ENVIRONMENTS_FETCH_SUCCEEDED:
      return state
        .set('environments', List(action.environments.environments));
    default:
      return state;
  }
}

export default appReducer;

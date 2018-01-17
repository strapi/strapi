/*
 *
 * App reducer
 *
 */

import { fromJS, List } from 'immutable';
import {
  ENVIRONMENTS_FETCH_SUCCEEDED,
  MENU_FETCH_SUCCEEDED,
} from './constants';

const initialState = fromJS({
  sections: List([]),
  environments: List([]),
  loading: true,
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case ENVIRONMENTS_FETCH_SUCCEEDED:
      return state
        .set('environments', List(action.environments.environments));
    case MENU_FETCH_SUCCEEDED:
      return state.set('sections', List(action.menu.sections)).set('loading', false);
    default:
      return state;
  }
}

export default appReducer;

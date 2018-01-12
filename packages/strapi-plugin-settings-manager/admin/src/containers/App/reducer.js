/*
 *
 * App reducer
 *
 */

import { fromJS, List } from 'immutable';
import {
  ENVIRONMENTS_FETCH_SUCCEEDED,
  FREEZE_APP,
  MENU_FETCH_SUCCEEDED,
  UNFREEZE_APP,
} from './constants';

/* eslint-disable new-cap */
const initialState = fromJS({
  blockApp: false,
  sections: List(), // eslint-disable-line new-cap
  environments: List(),
  loading: true,
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case ENVIRONMENTS_FETCH_SUCCEEDED:
      return state
        .set('environments', List(action.environments.environments));
    case FREEZE_APP:
      return state.set('blockApp', true);
    case MENU_FETCH_SUCCEEDED:
      return state.set('sections', List(action.menu.sections)).set('loading', false);
    case UNFREEZE_APP:
      return state.set('blockApp', false);
    default:
      return state;
  }
}

export default appReducer;

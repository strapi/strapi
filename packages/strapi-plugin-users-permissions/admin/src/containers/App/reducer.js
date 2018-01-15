/*
 *
 * App reducer
 *
 */

import { fromJS } from 'immutable';
import {
  FREEZE_APP,
  UNFREEZE_APP,
} from './constants';

const initialState = fromJS({
  blockApp: false,
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case FREEZE_APP:
      return state.set('blockApp', true);
    case UNFREEZE_APP:
      return state.set('blockApp', false);
    default:
      return state;
  }
}

export default appReducer;

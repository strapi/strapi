/**
 *
 * AdminPage reducer
 *
 */

import { fromJS, List } from 'immutable';
import { GET_UPLOAD_ENV_SUCCEEDED } from './constants';

const initialState = fromJS({
  appEnvironments: List([]),
});

function adminPageReducer(state = initialState, action) {
  switch (action.type) {
    case GET_UPLOAD_ENV_SUCCEEDED:
      return state.update('appEnvironments', () => List(action.data));
    default:
      return state;
  }
}

export default adminPageReducer;

/**
 *
 * main reducer
 */

import { fromJS } from 'immutable';
import {
  DELETE_LAYOUT,
  DELETE_LAYOUTS,
  GET_LAYOUT_SUCCEEDED,
} from './constants';

export const initialState = fromJS({
  layouts: fromJS({}),
});

function mainReducer(state = initialState, action) {
  switch (action.type) {
    case DELETE_LAYOUT:
      return state.removeIn(['layouts', action.uid]);
    case DELETE_LAYOUTS:
      return state.update('layouts', () => fromJS({}));
    case GET_LAYOUT_SUCCEEDED:
      return state.updateIn(['layouts', action.uid], () =>
        fromJS(action.layout)
      );
    default:
      return state;
  }
}

export default mainReducer;

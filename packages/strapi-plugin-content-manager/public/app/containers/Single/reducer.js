/*
 *
 * Single reducer
 *
 */

import { fromJS } from 'immutable';
import {
  LOAD_RECORD,
  LOADED_RECORD
} from './constants';

const initialState = fromJS({
  record: null
});

function singleReducer(state = initialState, action) {
  switch (action.type) {
    case LOAD_RECORD:
      return state
        .set('model', action.model)
        .set('id', action.id);
    case LOADED_RECORD:
      return state
        .set('record', action.record);
    default:
      return state;
  }
}

export default singleReducer;

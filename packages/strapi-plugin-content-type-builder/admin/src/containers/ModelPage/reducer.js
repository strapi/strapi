/*
 *
 * ModelPage reducer
 *
 */

import { fromJS, Map } from 'immutable';
/* eslint-disable new-cap */
import {
  MODEL_FETCH_SUCCEEDED,
} from './constants';

const initialState = fromJS({
  model: Map(),
});

function modelPageReducer(state = initialState, action) {
  switch (action.type) {
    case MODEL_FETCH_SUCCEEDED:
      return state
        .set('model', Map(action.model.model));
    default:
      return state;
  }
}

export default modelPageReducer;

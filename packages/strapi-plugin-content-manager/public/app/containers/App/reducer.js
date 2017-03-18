/*
 *
 * List reducer
 *
 */

import { fromJS } from 'immutable';
import {
  LOAD_MODELS,
  LOADED_MODELS,
} from './constants';

const initialState = fromJS({
  loading: false,
  models: {}
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case LOAD_MODELS:
      return state
        .set('loading', true);
    case LOADED_MODELS:
      return state
        .set('loading', false)
        .set('models', action.models);
    default:
      return state;
  }
}

export default appReducer;

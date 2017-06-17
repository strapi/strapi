/*
 *
 * List reducer
 *
 */

import { fromJS } from 'immutable';

import { LOAD_MODELS, LOADED_MODELS, UPDATE_SCHEMA } from './constants';

const initialState = fromJS({
  loading: false,
  models: false,
  schema: false,
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case LOAD_MODELS:
      return state.set('loading', true);
    case LOADED_MODELS:
      return state.set('loading', false).set('models', action.models);
    case UPDATE_SCHEMA:
      return state.set('schema', action.schema);
    default:
      return state;
  }
}

export default appReducer;

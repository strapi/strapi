/*
 *
 * List reducer
 *
 */

import { fromJS, List } from 'immutable';

import { EMPTY_STORE, LOAD_MODELS, LOADED_MODELS, UPDATE_SCHEMA } from './constants';

const initialState = fromJS({
  loading: true,
  models: false,
  schema: false,
  formValidations: List(),
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case EMPTY_STORE:
      return initialState;
    case LOAD_MODELS:
      return state;
    case LOADED_MODELS:
      return state
        .set('models', action.models);
    case UPDATE_SCHEMA:
      return state
        .set('loading', false)
        .set('schema', action.schema);
    default:
      return state;
  }
}

export default appReducer;

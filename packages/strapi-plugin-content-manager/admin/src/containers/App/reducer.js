/*
 *
 * List reducer
 *
 */

import { fromJS, List } from 'immutable';

import { EMPTY_STORE, GET_MODEL_ENTRIES_SUCCEEDED, LOAD_MODELS, LOADED_MODELS } from './constants';

const initialState = fromJS({
  modelEntries: 0,
  loading: true,
  schema: fromJS({}),
  formValidations: List([]),
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case EMPTY_STORE:
      return state;
    case GET_MODEL_ENTRIES_SUCCEEDED:
      return state.set('modelEntries', action.count);
    case LOAD_MODELS:
      return state;
    case LOADED_MODELS:
      return state
        .update('schema', () => fromJS(action.models.models))
        .set('loading', false);
    default:
      return state;
  }
}

export default appReducer;

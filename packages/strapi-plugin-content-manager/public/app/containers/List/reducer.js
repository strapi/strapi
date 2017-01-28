/*
 *
 * List reducer
 *
 */

import { fromJS } from 'immutable';
import {
  LOAD_RECORDS,
  LOADED_RECORDS
} from './constants';

const initialState = fromJS({
  loading: true,
  currentModel: null,
  models: {},
  schema: {}
});

function listReducer(state = initialState, action) {
  switch (action.type) {
    case LOAD_RECORDS:
      return state
        .set('loading', true)
        .set('currentModel', action.model);
    case LOADED_RECORDS:
      return state
        .set('loading', false)
        .set('schema', action.models)
        .setIn(['models', state.get('currentModel')], action.records);
    default:
      return state;
  }
}

export default listReducer;

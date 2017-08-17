/*
 *
 * App reducer
 *
 */

import { fromJS, Map, List } from 'immutable';
import { MODELS_FETCH, MODELS_FETCH_SUCCEEDED } from './constants';

/* eslint-disable new-cap */
const initialState = fromJS({
  loading: true,
  models: Map(),
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case MODELS_FETCH:
      return state.set('loading', true);
    case MODELS_FETCH_SUCCEEDED:
      console.log('ok');
      return state
        .set('loading', false)
        .set('models', List(action.models.models));
    default:
      return state;
  }
}

export default appReducer;

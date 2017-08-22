/*
 *
 * App reducer
 *
 */

import { fromJS, List } from 'immutable';
import { MODELS_FETCH, MODELS_FETCH_SUCCEEDED } from './constants';

/* eslint-disable new-cap */
const initialState = fromJS({
  loading: true,
  menu: List(),
  models: List(),
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case MODELS_FETCH:
      return state.set('loading', true);
    case MODELS_FETCH_SUCCEEDED:
      return state
        .set('loading', false)
        .set('menu', List(action.menu.sections))
        .set('models', List(action.data.models));
    default:
      return state;
  }
}

export default appReducer;

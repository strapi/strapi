/*
 *
 * Home reducer
 *
 */

import { fromJS, List, Map, OrderedMap } from 'immutable';
import {
  CONFIG_FETCH,
  ENVIRONMENTS_FETCH,
  CONFIG_FETCH_SUCCEEDED,
  ENVIRONMENTS_FETCH_SUCCEEDED,
} from './constants';

/* eslint-disable new-cap */
const initialState = fromJS({
  loading: false,
  configsDisplay: OrderedMap(),
  modifiedData: Map(),
  environments: List(),
});

function homeReducer(state = initialState, action) {
  switch (action.type) {
    case CONFIG_FETCH:
      return state.set('loading', true);
    case CONFIG_FETCH_SUCCEEDED:
      return state
        .set('loading', false)
        .set('configsDisplay', OrderedMap(action.configs));
    case ENVIRONMENTS_FETCH:
      return state.set('loading', true);
    case ENVIRONMENTS_FETCH_SUCCEEDED:
      return state
        .set('loading', false)
        .set('environments', List(action.environments.environments));
    default:
      return state;
  }
}

export default homeReducer;

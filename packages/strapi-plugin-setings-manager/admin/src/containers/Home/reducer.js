/*
 *
 * Home reducer
 *
 */

import { fromJS, Map, OrderedMap } from 'immutable';
import {
  CONFIG_FETCH,
  CONFIG_FETCH_SUCCEEDED,
  CHANGE_INPUT,
  CANCEL_CHANGES,
} from './constants';

/* eslint-disable new-cap */
const initialState = fromJS({
  loading: true,
  configsDisplay: OrderedMap(),
  initialData: Map(),
  modifiedData: Map(),
});

function homeReducer(state = initialState, action) {
  switch (action.type) {
    case CONFIG_FETCH:
      return state.set('loading', true);
    case CONFIG_FETCH_SUCCEEDED:
      return state
        .set('loading', false)
        .set('configsDisplay', OrderedMap(action.configs))
        .set('initialData', Map(action.data))
        .set('modifiedData', Map(action.data));
    case CHANGE_INPUT:
      return state.updateIn(['modifiedData', action.key], value => action.value); // eslint-disable-line no-unused-vars
    case CANCEL_CHANGES:
      return state.set('modifiedData', state.get('initialData'));
    default:
      return state;
  }
}

export default homeReducer;

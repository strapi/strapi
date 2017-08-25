/*
 *
 * App reducer
 *
 */

import { fromJS, List } from 'immutable';
import { size } from 'lodash';
import {
  MODELS_FETCH,
  MODELS_FETCH_SUCCEEDED,
  STORE_TEMPORARY_MENU,
} from './constants';

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
    case STORE_TEMPORARY_MENU:
      return state
        .updateIn(['menu', '0', 'items'], (list) => list.splice(size(state.getIn(['menu', 'items'])) - 1, 0, action.newLink))
        .update('models', array => array.splice(size(state.get('models')) - 1, 0, action.newModel));
    default:
      return state;
  }
}

export default appReducer;

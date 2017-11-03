/*
 *
 * App reducer
 *
 */

import { fromJS, List } from 'immutable';
import { findIndex, size } from 'lodash';
import {
  DELETE_CONTENT_TYPE,
  MODELS_FETCH,
  MODELS_FETCH_SUCCEEDED,
  STORE_TEMPORARY_MENU,
  TEMPORARY_CONTENT_TYPE_POSTED,
  TEMPORARY_CONTENT_TYPE_FIELDS_UPDATED,
} from './constants';

/* eslint-disable new-cap */
const initialState = fromJS({
  loading: true,
  menu: List(),
  models: List(),
});

function appReducer(state = initialState, action) {
  switch (action.type) {
    case DELETE_CONTENT_TYPE:
      return state
        .updateIn(['menu', '0', 'items'], (list) => list.splice(findIndex(state.getIn(['menu', '0', 'items']).toJS(), ['name', action.itemToDelete]), 1))
        .update('models', (array) => array.splice(findIndex(state.get('models').toJS(), ['name', action.itemToDelete]), 1));
    case MODELS_FETCH:
      return state.set('loading', true);
    case MODELS_FETCH_SUCCEEDED:
      return state
        .set('loading', false)
        .set('menu', List(action.menu.sections))
        .set('models', List(action.data.models));
    case STORE_TEMPORARY_MENU: {
      const modelsSize = size(state.get('models').toJS());
      return state
        .updateIn(['menu', '0', 'items'], (list) => list.splice(action.position, action.nbElementToRemove, action.newLink))
        .update('models', array => array.splice(action.nbElementToRemove === 0 ? modelsSize : modelsSize - 1 , 1, action.newModel));
    }
    case TEMPORARY_CONTENT_TYPE_FIELDS_UPDATED: {
      const newModel = state.getIn(['models', size(state.get('models').toJS()) - 1]);
      newModel.fields = action.fieldNumber;
      return state
        .updateIn(['models', size(state.get('models').toJS()) - 1], () => newModel);
    }
    case TEMPORARY_CONTENT_TYPE_POSTED: {
      const newModel = state.getIn(['models', size(state.get('models').toJS()) - 1]);
      newModel.isTemporary = false;
      newModel.fields = action.fieldNumber;
      const oldMenuItem = state.getIn(['menu', '0', 'items', size(state.getIn(['menu', '0', 'items']).toJS()) -2]);
      oldMenuItem.isTemporary = false;
      const newData = oldMenuItem;
      return state
        .updateIn(['menu', '0', 'items', size(state.getIn(['menu', '0', 'items']).toJS()) -2], () => newData)
        .updateIn(['models', size(state.get('models').toJS()) - 1], () => newModel);
    }
    default:
      return state;
  }
}

export default appReducer;

/*
 *
 * ModelPage reducer
 *
 */

import { fromJS, Map, List } from 'immutable';
// import { findIndex, differenceWith, isEqual, filter } from 'lodash';
/* eslint-disable new-cap */
import {
  ADD_ATTRIBUTE_TO_CONTENT_TYPE,
  CANCEL_CHANGES,
  DELETE_ATTRIBUTE,
  MODEL_FETCH_SUCCEEDED,
  POST_CONTENT_TYPE_SUCCEEDED,
  UPDATE_CONTENT_TYPE,
} from './constants';

const initialState = fromJS({
  initialModel: Map({
    attributes: List(),
  }),
  model: Map({
    attributes: List(),
  }),
  postContentTypeSuccess: false,
  showButtons: false,
});

function modelPageReducer(state = initialState, action) {
  switch (action.type) {
    case ADD_ATTRIBUTE_TO_CONTENT_TYPE:
      return state
        .updateIn(['model', 'attributes'], (list) => list.push(action.newAttribute))
        .set('showButtons', true);
    case CANCEL_CHANGES:
      return state
        .set('showButtons', false)
        .set('model', state.get('initialModel'));
    case DELETE_ATTRIBUTE: {
      return state
        .set('showButtons', true)
        .updateIn(['model', 'attributes'], (list) => list.splice(action.position, 1));
    }
    case MODEL_FETCH_SUCCEEDED:
      return state
        .set('model', Map(action.model.model))
        .set('initialModel', Map(action.model.model))
        .setIn(['model', 'attributes'], List(action.model.model.attributes))
        .setIn(['initialModel', 'attributes'], List(action.model.model.attributes));
    case POST_CONTENT_TYPE_SUCCEEDED:
      return state.set('postContentTypeSuccess', !state.get('postContentTypeSuccess'));
    case UPDATE_CONTENT_TYPE:
      return state
        .set('model', Map(action.data))
        .set('initialModel', Map(action.data))
        .setIn(['model', 'attributes'], List(action.data.attributes))
        .setIn(['initialModel', 'attributes'], List(action.data.attributes));
    default:
      return state;
  }
}

export default modelPageReducer;

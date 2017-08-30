/*
 *
 * ModelPage reducer
 *
 */

import { fromJS, Map, List } from 'immutable';
/* eslint-disable new-cap */
import {
  ADD_ATTRIBUTE_TO_CONTENT_TYPE,
  CANCEL_CHANGES,
  DELETE_ATTRIBUTE,
  MODEL_FETCH_SUCCEEDED,
  POST_CONTENT_TYPE_SUCCEEDED,
} from './constants';

const initialState = fromJS({
  initialModel: Map({
    attributes: List(),
  }),
  model: Map({
    attributes: List(),
  }),
  postContentTypeSuccess: false,
});

function modelPageReducer(state = initialState, action) {
  switch (action.type) {
    case ADD_ATTRIBUTE_TO_CONTENT_TYPE:
      return state.updateIn(['model', 'attributes'], (list) => list.push(action.newAttribute));
    case CANCEL_CHANGES:
      return state.set('model', state.get('initialModel'));
    case DELETE_ATTRIBUTE:
      return state
        .updateIn(['model', 'attributes'], (list) => list.splice(action.position, 1));
    case MODEL_FETCH_SUCCEEDED:
      return state
        .set('model', Map(action.model.model))
        .set('initialModel', Map(action.model.model))
        .setIn(['model', 'attributes'], List(action.model.model.attributes))
        .setIn(['initialModel', 'attributes'], List(action.model.model.attributes));
    case POST_CONTENT_TYPE_SUCCEEDED:
      return state.set('postContentTypeSuccess', !state.get('postContentTypeSuccess'));
    default:
      return state;
  }
}

export default modelPageReducer;

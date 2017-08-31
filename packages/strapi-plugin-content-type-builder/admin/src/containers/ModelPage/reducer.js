/*
 *
 * ModelPage reducer
 *
 */

import { fromJS, Map, List } from 'immutable';
import { get, size, differenceBy } from 'lodash';
import { storeData } from '../../utils/storeData';
/* eslint-disable new-cap */
import {
  ADD_ATTRIBUTE_TO_CONTENT_TYPE,
  CANCEL_CHANGES,
  DELETE_ATTRIBUTE,
  MODEL_FETCH_SUCCEEDED,
  POST_CONTENT_TYPE_SUCCEEDED,
  RESET_SHOW_BUTTONS_PROPS,
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
      const contentTypeAttributes = state.getIn(['model', 'attributes']).toJS();
      contentTypeAttributes.splice(action.position, 1);
      const updatedContentTypeAttributes = contentTypeAttributes;

      let showButtons = size(updatedContentTypeAttributes) !== size(state.getIn(['initialModel', 'attributes']).toJS())
        || size(differenceBy(state.getIn(['initialModel', 'attributes']).toJS(), updatedContentTypeAttributes, 'name')) > 0;

      if (get(storeData.getContentType(), 'name') === state.getIn(['initialModel', 'name'])) {
        showButtons = size(get(storeData.getContentType(), 'attributes')) > 0;
      }
      
      return state
        .set('showButtons', showButtons)
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
    case RESET_SHOW_BUTTONS_PROPS:
      return state.set('showButtons', false);
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

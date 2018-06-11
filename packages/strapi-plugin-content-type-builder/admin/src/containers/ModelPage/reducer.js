/*
 *
 * ModelPage reducer
 *
 */

import { fromJS, Map, List } from 'immutable';
import { get, size, differenceBy, findIndex } from 'lodash';
import { storeData } from '../../utils/storeData';
/* eslint-disable new-cap */
import {
  ADD_ATTRIBUTE_RELATION_TO_CONTENT_TYPE,
  ADD_ATTRIBUTE_TO_CONTENT_TYPE,
  CANCEL_CHANGES,
  EDIT_CONTENT_TYPE_ATTRIBUTE,
  EDIT_CONTENT_TYPE_ATTRIBUTE_RELATION,
  DELETE_ATTRIBUTE,
  MODEL_FETCH_SUCCEEDED,
  POST_CONTENT_TYPE_SUCCEEDED,
  RESET_SHOW_BUTTONS_PROPS,
  SET_BUTTON_LOADER,
  SUBMIT_ACTION_SUCCEEDED,
  UNSET_BUTTON_LOADER,
  UPDATE_CONTENT_TYPE,
} from './constants';

const initialState = fromJS({
  didFetchModel: false,
  initialModel: Map({
    attributes: List(),
  }),
  model: Map({
    attributes: List(),
  }),
  postContentTypeSuccess: false,
  showButtons: false,
  modelLoading: true,
  showButtonLoader: false,
});

function modelPageReducer(state = initialState, action) {
  switch (action.type) {
    case ADD_ATTRIBUTE_RELATION_TO_CONTENT_TYPE:
      return state
        .updateIn(['model', 'attributes'], (list) => list.push(action.newAttribute, action.parallelAttribute))
        .set('showButtons', true);
    case ADD_ATTRIBUTE_TO_CONTENT_TYPE:
      return state
        .updateIn(['model', 'attributes'], (list) => list.push(action.newAttribute))
        .set('showButtons', true);
    case CANCEL_CHANGES:
      return state
        .set('showButtons', false)
        .set('model', state.get('initialModel'));
    case EDIT_CONTENT_TYPE_ATTRIBUTE: {
      if (action.shouldAddParralAttribute) {
        return state
          .set('showButtons', true)
          .updateIn(['model', 'attributes', action.attributePosition], () => action.modifiedAttribute)
          .updateIn(['model', 'attributes'], (list) => list.splice(action.attributePosition + 1, 0, action.parallelAttribute));
      }

      return state
        .set('showButtons', true)
        .updateIn(['model', 'attributes', action.attributePosition], () => action.modifiedAttribute);
    }
    case EDIT_CONTENT_TYPE_ATTRIBUTE_RELATION: {
      if (action.shouldRemoveParallelAttribute) {
        return state
          .set('showButtons', true)
          .updateIn(['model', 'attributes', action.attributePosition], () => action.modifiedAttribute)
          .updateIn(['model', 'attributes'], (list) => list.splice(action.parallelAttributePosition, 1));
      }
      return state
        .set('showButtons', true)
        .updateIn(['model', 'attributes', action.attributePosition], () => action.modifiedAttribute)
        .updateIn(['model', 'attributes', action.parallelAttributePosition], () => action.parallelAttribute);
    }
    case DELETE_ATTRIBUTE: {
      const contentTypeAttributes = state.getIn(['model', 'attributes']).toJS();
      contentTypeAttributes.splice(action.position, 1);
      const updatedContentTypeAttributes = contentTypeAttributes;

      let showButtons = size(updatedContentTypeAttributes) !== size(state.getIn(['initialModel', 'attributes']).toJS())
        || size(differenceBy(state.getIn(['initialModel', 'attributes']).toJS(), updatedContentTypeAttributes, 'name')) > 0;

      if (get(storeData.getContentType(), 'name') === state.getIn(['initialModel', 'name'])) {
        showButtons = size(get(storeData.getContentType(), 'attributes')) > 0;
      }

      if (action.shouldRemoveParallelAttribute) {
        const attributeKey = state.getIn(['model', 'attributes', action.position]).params.key;

        return state
          .set('showButtons', showButtons)
          .updateIn(['model', 'attributes'], (list) => list.splice(action.position, 1))
          .updateIn(['model', 'attributes'], (list) => list.splice(findIndex(list.toJS(), ['name', attributeKey]), 1));
      }

      return state
        .set('showButtons', showButtons)
        .updateIn(['model', 'attributes'], (list) => list.splice(action.position, 1));
    }
    case MODEL_FETCH_SUCCEEDED:
      return state
        .set('didFetchModel', !state.get('didFetchModel'))
        .set('modelLoading', false)
        .set('model', Map(action.model.model))
        .set('initialModel', Map(action.model.model))
        .setIn(['model', 'attributes'], List(action.model.model.attributes))
        .setIn(['initialModel', 'attributes'], List(action.model.model.attributes));
    case POST_CONTENT_TYPE_SUCCEEDED:
      return state.set('postContentTypeSuccess', !state.get('postContentTypeSuccess'));
    case RESET_SHOW_BUTTONS_PROPS:
      return state.set('showButtons', false);
    case SET_BUTTON_LOADER:
      return state.set('showButtonLoader', true);
    case SUBMIT_ACTION_SUCCEEDED:
      return state.set('initialModel', state.get('model'));
    case UNSET_BUTTON_LOADER:
      return state.set('showButtonLoader', false);
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

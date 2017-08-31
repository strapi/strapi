/*
 *
 * ModelPage actions
 *
 */
import { forEach, get, includes, map, set } from 'lodash';
import { storeData } from '../../utils/storeData';

import {
  ADD_ATTRIBUTE_TO_CONTENT_TYPE,
  CANCEL_CHANGES,
  DEFAULT_ACTION,
  DELETE_ATTRIBUTE,
  MODEL_FETCH,
  MODEL_FETCH_SUCCEEDED,
  POST_CONTENT_TYPE_SUCCEEDED,
  SUBMIT,
  RESET_SHOW_BUTTONS_PROPS,
  UPDATE_CONTENT_TYPE,
} from './constants';

export function addAttributeToContentType(newAttribute) {
  return {
    type: ADD_ATTRIBUTE_TO_CONTENT_TYPE,
    newAttribute,
  };
}

export function cancelChanges() {
  return {
    type: CANCEL_CHANGES,
  };
}

export function deleteAttribute(position, modelName) {
  const temporaryContentType = storeData.getContentType();
  let sendRequest = true;
  if (get(temporaryContentType, 'name') === modelName) {
    sendRequest = false;
    temporaryContentType.attributes.splice(position, 1);
    const updatedContentType = temporaryContentType;
    storeData.setContentType(updatedContentType);
  }

  return {
    type: DELETE_ATTRIBUTE,
    position,
    sendRequest,
    modelName,
  };
}

export function defaultAction() {
  return {
    type: DEFAULT_ACTION,
  };
}

export function modelFetch(modelName) {
  return {
    type: MODEL_FETCH,
    modelName,
  };
}

export function modelFetchSucceeded(data) {
  const model = data;
  const defaultKeys = ['required', 'unique', 'type'];

  forEach(model.model.attributes, (attribute, index) => {
    map(attribute.params, (value, key) => {
      if (!includes(defaultKeys, key) && value) {
        set(model.model.attributes[index].params, `${key}Value`, value);
        set(model.model.attributes[index].params, key, true);
      }
    });
  });

  return {
    type: MODEL_FETCH_SUCCEEDED,
    model,
  };
}

export function postContentTypeSucceeded() {
  return {
    type: POST_CONTENT_TYPE_SUCCEEDED,
  };
}

export function resetShowButtonsProps() {
  return {
    type: RESET_SHOW_BUTTONS_PROPS,
  };
}

export function submit() {
  return {
    type: SUBMIT,
  }
}

export function updateContentType(data) {
  return {
    type: UPDATE_CONTENT_TYPE,
    data,
  };
}

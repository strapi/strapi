/*
 *
 * ModelPage actions
 *
 */
import { get } from 'lodash';
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

export function modelFetchSucceeded(model) {
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

export function submit() {
  return {
    type: SUBMIT,
  }
}

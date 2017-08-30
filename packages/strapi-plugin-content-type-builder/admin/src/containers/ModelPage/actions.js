/*
 *
 * ModelPage actions
 *
 */
import { get } from 'lodash';
import { storeData } from '../../utils/storeData';

import {
  DEFAULT_ACTION,
  DELETE_ATTRIBUTE,
  MODEL_FETCH,
  MODEL_FETCH_SUCCEEDED,
} from './constants';

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

/*
 *
 * ModelPage actions
 *
 */
import { cloneDeep, forEach, get, includes, map, set } from 'lodash';
import { storeData } from '../../utils/storeData';

import {
  ADD_ATTRIBUTE_RELATION_TO_CONTENT_TYPE,
  ADD_ATTRIBUTE_TO_CONTENT_TYPE,
  EDIT_CONTENT_TYPE_ATTRIBUTE,
  EDIT_CONTENT_TYPE_ATTRIBUTE_RELATION,
  CANCEL_CHANGES,
  DEFAULT_ACTION,
  DELETE_ATTRIBUTE,
  MODEL_FETCH,
  MODEL_FETCH_SUCCEEDED,
  POST_CONTENT_TYPE_SUCCEEDED,
  SET_BUTTON_LOADER,
  SUBMIT,
  RESET_SHOW_BUTTONS_PROPS,
  UNSET_BUTTON_LOADER,
  UPDATE_CONTENT_TYPE,
} from './constants';

export function addAttributeRelationToContentType(newAttribute) {
  return {
    type: ADD_ATTRIBUTE_RELATION_TO_CONTENT_TYPE,
    newAttribute,
    parallelAttribute: setParallelAttribute(newAttribute),
  };
}

export function addAttributeToContentType(newAttribute) {
  return {
    type: ADD_ATTRIBUTE_TO_CONTENT_TYPE,
    newAttribute,
  };
}

export function editContentTypeAttribute(modifiedAttribute, attributePosition, shouldAddParralAttribute) {
  return {
    type: EDIT_CONTENT_TYPE_ATTRIBUTE,
    modifiedAttribute,
    attributePosition,
    shouldAddParralAttribute,
    parallelAttribute: setParallelAttribute(modifiedAttribute),
  };
}

export function editContentTypeAttributeRelation(modifiedAttribute, attributePosition, parallelAttributePosition, shouldRemoveParallelAttribute) {
  return {
    type: EDIT_CONTENT_TYPE_ATTRIBUTE_RELATION,
    modifiedAttribute,
    attributePosition,
    parallelAttribute: setParallelAttribute(modifiedAttribute),
    parallelAttributePosition,
    shouldRemoveParallelAttribute,
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
  const defaultKeys = ['required', 'unique', 'type', 'key', 'target', 'nature', 'targetColumnName', 'columnName'];

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

export function setButtonLoader() {
  return {
    type: SET_BUTTON_LOADER,
  };
}

export function submit() {
  return {
    type: SUBMIT,
  }
}

export function unsetButtonLoader() {
  return {
    type: UNSET_BUTTON_LOADER,
  };
}

export function updateContentType(data) {
  return {
    type: UPDATE_CONTENT_TYPE,
    data,
  };
}



function setParallelAttribute(data) {
  const parallelAttribute = cloneDeep(data);

  parallelAttribute.params.key = data.name;
  parallelAttribute.name = data.params.key;

  return parallelAttribute;
}

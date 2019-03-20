/*
 *
 * App actions
 *
 */
import { pick, set, camelCase } from 'lodash';
import {
  ADD_ATTRIBUTE_TO_EXISITING_CONTENT_TYPE,
  ADD_ATTRIBUTE_TO_TEMP_CONTENT_TYPE,
  CANCEL_NEW_CONTENT_TYPE,
  CLEAR_TEMPORARY_ATTRIBUTE,
  CREATE_TEMP_CONTENT_TYPE,
  DELETE_MODEL,
  DELETE_MODEL_ATTRIBUTE,
  DELETE_MODEL_SUCCEEDED,
  DELETE_TEMPORARY_MODEL,
  GET_DATA,
  GET_DATA_SUCCEEDED,
  ON_CHANGE_NEW_CONTENT_TYPE_MAIN_INFOS,
  ON_CREATE_ATTRIBUTE,
  RESET_NEW_CONTENT_TYPE_MAIN_INFOS,
  RESET_EDIT_EXISTING_CONTENT_TYPE,
  RESET_EXISTING_CONTENT_TYPE_MAIN_INFOS,
  RESET_EDIT_TEMP_CONTENT_TYPE,
  RESET_PROPS,
  SAVE_EDITED_ATTRIBUTE,
  SET_TEMPORARY_ATTRIBUTE,
  SUBMIT_TEMP_CONTENT_TYPE,
  SUBMIT_TEMP_CONTENT_TYPE_SUCCEEDED,
  UPDATE_TEMP_CONTENT_TYPE,
  ON_CHANGE_EXISTING_CONTENT_TYPE_MAIN_INFOS,
} from './constants';

export function addAttributeToExistingContentType(contentTypeName, attributeType) {
  return {
    type: ADD_ATTRIBUTE_TO_EXISITING_CONTENT_TYPE,
    attributeType,
    contentTypeName,
  };
}

export function addAttributeToTempContentType(attributeType) {
  return {
    type: ADD_ATTRIBUTE_TO_TEMP_CONTENT_TYPE,
    attributeType,
  };
}

export function cancelNewContentType() {
  return {
    type: CANCEL_NEW_CONTENT_TYPE,
  };
}

export function clearTemporaryAttribute() {
  return {
    type: CLEAR_TEMPORARY_ATTRIBUTE,
  };
}

export function createTempContentType() {
  return {
    type: CREATE_TEMP_CONTENT_TYPE,
  };
}

export function deleteModel(modelName) {
  return {
    type: DELETE_MODEL,
    modelName,
  };
}

export function deleteModelAttribute(keys) {
  return {
    type: DELETE_MODEL_ATTRIBUTE,
    keys,
  };
}

export function deleteModelSucceeded(modelName) {
  return {
    type: DELETE_MODEL_SUCCEEDED,
    modelName,
  };
}

export function deleteTemporaryModel() {
  return {
    type: DELETE_TEMPORARY_MODEL,
  };
}

export function getData() {
  return {
    type: GET_DATA,
  };
}

export function getDataSucceeded({ allModels, models }, connections) {
  const initialData = allModels.reduce((acc, current) => {
    acc[current.name] = pick(current, ['name', 'collectionName', 'connection', 'description', 'mainField']);
    const attributes = buildModelAttributes(current.attributes);
    set(acc, [current.name, 'attributes'], attributes);

    return acc;
  }, {});

  return {
    type: GET_DATA_SUCCEEDED,
    initialData,
    models,
    connections,
  };
}

export function onChangeExistingContentTypeMainInfos({ target }) {
  const value = target.name === 'name' ? camelCase(target.value.trim()).toLowerCase() : target.value.trim();

  return {
    type: ON_CHANGE_EXISTING_CONTENT_TYPE_MAIN_INFOS,
    keys: target.name.split('.'),
    value,
  };
}

export function onChangeNewContentTypeMainInfos({ target }) {
  const value = target.name === 'name' ? camelCase(target.value.trim()).toLowerCase() : target.value.trim();

  return {
    type: ON_CHANGE_NEW_CONTENT_TYPE_MAIN_INFOS,
    keys: target.name.split('.'),
    value,
  };
}

export function onCreateAttribute({ target }) {
  return {
    type: ON_CREATE_ATTRIBUTE,
    keys: target.name.split('.'),
    value: target.value,
  };
}

export function saveEditedAttribute(attributeName, isModelTemporary, modelName) {
  return {
    type: SAVE_EDITED_ATTRIBUTE,
    attributeName,
    isModelTemporary,
    modelName,
  };
}

export function setTemporaryAttribute(attributeName, isModelTemporary, modelName) {
  return {
    type: SET_TEMPORARY_ATTRIBUTE,
    attributeName,
    isModelTemporary,
    modelName,
  };
}

export function resetNewContentTypeMainInfos() {
  return {
    type: RESET_NEW_CONTENT_TYPE_MAIN_INFOS,
  };
}

export function resetEditExistingContentType(contentTypeName) {
  return {
    type: RESET_EDIT_EXISTING_CONTENT_TYPE,
    contentTypeName,
  };
}

export function resetExistingContentTypeMainInfos(contentTypeName) {
  return {
    type: RESET_EXISTING_CONTENT_TYPE_MAIN_INFOS,
    contentTypeName,
  };
}

export function resetEditTempContentType() {
  return {
    type: RESET_EDIT_TEMP_CONTENT_TYPE,
  };
}

export function resetProps() {
  return {
    type: RESET_PROPS,
  };
}

export function submitTempContentType() {
  return {
    type: SUBMIT_TEMP_CONTENT_TYPE,
  };
}

export function submitTempContentTypeSucceeded() {
  return {
    type: SUBMIT_TEMP_CONTENT_TYPE_SUCCEEDED,
  };
}

export function updateTempContentType() {
  return {
    type: UPDATE_TEMP_CONTENT_TYPE,
  };
}

// utils
export const buildModelAttributes = attributes => {
  const formattedAttributes = attributes.reduce((acc, current) => {
    acc[current.name] = current.params;

    return acc;
  }, {});

  return formattedAttributes;
};

/*
 *
 * App actions
 *
 */
import { pick, set, camelCase } from 'lodash';
import {
  ADD_ATTRIBUTE_TO_TEMP_CONTENT_TYPE,
  CANCEL_NEW_CONTENT_TYPE,
  CLEAR_TEMPORARY_ATTRIBUTE,
  CREATE_TEMP_CONTENT_TYPE,
  DELETE_MODEL,
  DELETE_MODEL_SUCCEEDED,
  GET_DATA,
  GET_DATA_SUCCEEDED,
  ON_CHANGE_NEW_CONTENT_TYPE,
  ON_CREATE_ATTRIBUTE,
  SUBMIT_TEMP_CONTENT_TYPE,
  SUBMIT_TEMP_CONTENT_TYPE_SUCCEEDED,
} from './constants';

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

export function deleteModelSucceeded(modelName) {
  return {
    type: DELETE_MODEL_SUCCEEDED,
    modelName,
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

export function onChangeNewContentType({ target }) {
  const value = target.name === 'name' ? camelCase(target.value.trim()).toLowerCase() : target.value.trim();

  return {
    type: ON_CHANGE_NEW_CONTENT_TYPE,
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

// utils
export const buildModelAttributes = (attributes) => {
  const formattedAttributes = attributes.reduce((acc, current) => {
    acc[current.name] = current.params;

    return acc;
  }, {});

  return formattedAttributes;
};

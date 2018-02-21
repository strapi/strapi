/**
 *
 * EditPage actions
 *
 */

import {
  CHANGE_DATA,
  GET_DATA,
  GET_DATA_SUCCEEDED,
  INIT_MODEL_PROPS,
  RESET_PROPS,
} from './constants';

export function changeData({ target }) {
  return {
    type: CHANGE_DATA,
    keys: target.name.split('.'),
    value: target.value,
  };
}

export function getData(id, source, mainField) {
  return {
    type: GET_DATA,
    id,
    source,
    mainField,
  };
}

export function getDataSucceeded(id, data, pluginHeaderTitle) {
  console.log('yuyy', pluginHeaderTitle);
  return {
    type: GET_DATA_SUCCEEDED,
    id,
    data,
    pluginHeaderTitle,
  };
}

export function initModelProps(modelName, isCreating, source, attributes) {
  const form = Object.keys(attributes).map(attr => [attr, '']);

  return {
    type: INIT_MODEL_PROPS,
    modelName,
    isCreating,
    source,
    form,
  };
}

export function resetProps() {
  return {
    type: RESET_PROPS,
  };
}

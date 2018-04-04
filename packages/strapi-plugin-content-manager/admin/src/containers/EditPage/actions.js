/**
 *
 * EditPage actions
 *
 */

import { get } from 'lodash';
import { getValidationsFromForm } from 'utils/formValidations';

import {
  CHANGE_DATA,
  GET_DATA,
  GET_DATA_SUCCEEDED,
  GET_LAYOUT,
  GET_LAYOUT_SUCCEEDED,
  INIT_MODEL_PROPS,
  ON_CANCEL,
  RESET_PROPS,
  SET_FILE_RELATIONS,
  SET_LOADER,
  SET_FORM_ERRORS,
  SUBMIT,
  SUBMIT_SUCCESS,
  UNSET_LOADER,
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
  return {
    type: GET_DATA_SUCCEEDED,
    id,
    data,
    pluginHeaderTitle,
  };
}

export function getLayout(source) {
  return {
    type: GET_LAYOUT,
    source,
  };
}

export function getLayoutSucceeded(layout) {
  return {
    type: GET_LAYOUT_SUCCEEDED,
    layout,
  };
}

export function initModelProps(modelName, isCreating, source, attributes) {
  const formValidations = getValidationsFromForm(
    Object.keys(attributes).map(attr => ({ name: attr, validations: get(attributes, attr, {}) })),
    [],
  );
  const record = Object.keys(attributes).reduce((acc, current) => {
    if (attributes[current].default) {
      acc[current] = attributes[current].default;
    }
    return acc;
  }, {});

  return {
    type: INIT_MODEL_PROPS,
    formValidations,
    isCreating,
    modelName,
    record,
    source,
  };
}

export function onCancel() {
  return {
    type: ON_CANCEL,
  };
}

export function resetProps() {
  return {
    type: RESET_PROPS,
  };
}

export function setFileRelations(fileRelations) {
  return {
    type: SET_FILE_RELATIONS,
    fileRelations,
  };
}

export function setFormErrors(formErrors) {
  return {
    type: SET_FORM_ERRORS,
    formErrors,
  };
}

export function setLoader() {
  return {
    type: SET_LOADER,
  };
}

export function submit() {
  return {
    type: SUBMIT,
  };
}

export function submitSuccess() {
  return {
    type: SUBMIT_SUCCESS,
  };
}

export function unsetLoader() {
  return {
    type: UNSET_LOADER,
  };
}

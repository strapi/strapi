/*
 *
 * Edit actions
 *
 */
import { get } from 'lodash';
import { getValidationsFromForm } from '../../utils/formValidations';

import {
  CANCEL_CHANGES,
  DELETE_RECORD,
  DELETE_RECORD_ERROR,
  DELETE_RECORD_SUCCESS,
  EDIT_RECORD,
  EDIT_RECORD_ERROR,
  EDIT_RECORD_SUCCESS,
  SET_CURRENT_MODEL_NAME,
  SET_IS_CREATING,
  SET_INITIAL_STATE,
  LOAD_RECORD,
  LOAD_RECORD_SUCCESS,
  SET_RECORD_ATTRIBUTE,
  TOGGLE_NULL,
  RESET_EDIT_SUCCESS,
  SET_FORM_VALIDATIONS,
  SET_FORM,
  SET_FORM_ERRORS,
} from './constants';

export function cancelChanges() {
  return {
    type: CANCEL_CHANGES,
  };
}

export function deleteRecord(id, modelName, source) {
  return {
    type: DELETE_RECORD,
    id,
    modelName,
    source,
  };
}

export function editRecord(source) {
  return {
    type: EDIT_RECORD,
    source,
  };
}

export function loadRecord(id, source) {
  return {
    type: LOAD_RECORD,
    id,
    source,
  };
}


export function recordDeleted(id) {
  return {
    type: DELETE_RECORD_SUCCESS,
    id,
  };
}

export function recordDeleteError() {
  return {
    type: DELETE_RECORD_ERROR,
  };
}

export function recordEdited() {
  return {
    type: EDIT_RECORD_SUCCESS,
  };
}

export function recordEditError() {
  return {
    type: EDIT_RECORD_ERROR,
  };
}

export function recordLoaded(record) {
  return {
    type: LOAD_RECORD_SUCCESS,
    record,
  };
}

export function resetEditSuccess() {
  return {
    type: RESET_EDIT_SUCCESS,
  };
}

export function setCurrentModelName(currentModelName) {
  return {
    type: SET_CURRENT_MODEL_NAME,
    currentModelName,
  };
}

export function setForm(data) {
  const form = [];
  Object.keys(data).map(attr => {
    form.push([attr, '']);
  });

  return {
    type: SET_FORM,
    form,
  };
}

export function setFormErrors(formErrors) {
  return {
    type: SET_FORM_ERRORS,
    formErrors,
  };
}

export function setFormValidations(data) {
  const form = Object.keys(data).map(attr => {
    return { name: attr,  validations: get(data, attr) || {} };
  });

  const formValidations = getValidationsFromForm(form, []);

  return {
    type: SET_FORM_VALIDATIONS,
    formValidations,
  };
}

export function setInitialState() {
  return {
    type: SET_INITIAL_STATE,
  };
}


export function setIsCreating() {
  return {
    type: SET_IS_CREATING,
  };
}

export function setRecordAttribute(key, value) {
  return {
    type: SET_RECORD_ATTRIBUTE,
    key,
    value,
  };
}

export function toggleNull() {
  return {
    type: TOGGLE_NULL,
  };
}

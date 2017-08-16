/*
 *
 * Edit actions
 *
 */

import {
  SET_INITIAL_STATE,
  SET_CURRENT_MODEL_NAME,
  SET_IS_CREATING,
  LOAD_RECORD,
  LOAD_RECORD_SUCCESS,
  SET_RECORD_ATTRIBUTE,
  EDIT_RECORD,
  EDIT_RECORD_SUCCESS,
  EDIT_RECORD_ERROR,
  DELETE_RECORD,
  DELETE_RECORD_SUCCESS,
  DELETE_RECORD_ERROR,
} from './constants';

export function setInitialState() {
  return {
    type: SET_INITIAL_STATE,
  };
}

export function setCurrentModelName(currentModelName) {
  return {
    type: SET_CURRENT_MODEL_NAME,
    currentModelName,
  };
}

export function setIsCreating() {
  return {
    type: SET_IS_CREATING,
  };
}

export function loadRecord(id) {
  return {
    type: LOAD_RECORD,
    id,
  };
}

export function recordLoaded(record) {
  return {
    type: LOAD_RECORD_SUCCESS,
    record,
  };
}

export function setRecordAttribute(key, value) {
  return {
    type: SET_RECORD_ATTRIBUTE,
    key,
    value,
  };
}

export function editRecord() {
  return {
    type: EDIT_RECORD,
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

export function deleteRecord() {
  return {
    type: DELETE_RECORD,
  };
}

export function recordDeleted() {
  return {
    type: DELETE_RECORD_SUCCESS,
  };
}

export function recordDeleteError() {
  return {
    type: DELETE_RECORD_ERROR,
  };
}

/*
 *
 * HomePage actions
 *
 */

import {
  GET_DOC_INFOS,
  GET_DOC_INFOS_SUCCEEDED,
  ON_CHANGE,
  ON_CLICK_DELETE_DOC,
  ON_CONFIRM_DELETE_DOC,
  ON_SUBMIT,
  ON_UPDATE_DOC,
  SET_FORM_ERRORS,
} from './constants';

export function getDocInfos() {
  return {
    type: GET_DOC_INFOS,
  };
}

export function getDocInfosSucceeded(data) {
  return {
    type: GET_DOC_INFOS_SUCCEEDED,
    data,
  };
}

export function onChange({ target }) {
  return {
    type: ON_CHANGE,
    keys: target.name.split('.'),
    value: target.value,
  };
}

export function onClickDeleteDoc(version) {
  return {
    type: ON_CLICK_DELETE_DOC,
    version,
  };
}

export function onConfirmDeleteDoc() {
  return {
    type: ON_CONFIRM_DELETE_DOC,
  };
}

export function onSubmit(e) {
  e.preventDefault();

  return {
    type: ON_SUBMIT,
  };
}

export function onUpdateDoc(version) {
  return {
    type: ON_UPDATE_DOC,
    version,
  };
}

export function setFormErrors(errors) {
  return {
    type: SET_FORM_ERRORS,
    errors,
  };
}

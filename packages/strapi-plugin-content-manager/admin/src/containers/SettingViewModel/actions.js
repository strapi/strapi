import { set } from 'lodash';
import {
  ADD_FIELD_TO_LIST,
  GET_DATA,
  GET_DATA_SUCCEEDED,
  MOVE_FIELD_LIST,
  ON_CHANGE,
  ON_REMOVE_LIST_FIELD,
  ON_RESET,
  ON_SUBMIT,
  RESET_PROPS,
  SET_LIST_FIELD_TO_EDIT_INDEX,
  SUBMIT_SUCCEEDED,
} from './constants';
import { formatLayout, createLayout } from '../../utils/layout';

export function addFieldToList(field) {
  return {
    type: ADD_FIELD_TO_LIST,
    field,
  };
}

export function getData(uid) {
  return {
    type: GET_DATA,
    uid,
  };
}

export function getDataSucceeded(layout) {
  set(
    layout,
    ['layouts', 'edit'],
    formatLayout(createLayout(layout.layouts.edit))
  );
  return {
    type: GET_DATA_SUCCEEDED,
    layout,
  };
}

export function moveListField(dragIndex, overIndex) {
  return {
    type: MOVE_FIELD_LIST,
    dragIndex,
    overIndex,
  };
}

export function onChange({ target: { name, value } }) {
  return {
    type: ON_CHANGE,
    keys: ['modifiedData', ...name.split('.')],
    value,
  };
}

export function onRemoveListField(index) {
  return {
    type: ON_REMOVE_LIST_FIELD,
    index,
  };
}

export function onReset() {
  return {
    type: ON_RESET,
  };
}
export function onSubmit(uid, emitEvent) {
  return {
    type: ON_SUBMIT,
    uid,
    emitEvent,
  };
}

export function resetProps() {
  return {
    type: RESET_PROPS,
  };
}

export function setListFieldToEditIndex(index) {
  return {
    type: SET_LIST_FIELD_TO_EDIT_INDEX,
    index,
  };
}

export function submitSucceeded() {
  return {
    type: SUBMIT_SUCCEEDED,
  };
}

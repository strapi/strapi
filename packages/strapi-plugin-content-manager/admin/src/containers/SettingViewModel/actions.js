import { set } from 'lodash';
import {
  ADD_FIELD_TO_LIST,
  ADD_RELATION,
  FORMAT_LAYOUT,
  GET_DATA,
  GET_DATA_SUCCEEDED,
  MOVE_FIELD_LIST,
  MOVE_RELATION,
  MOVE_ROW,
  ON_ADD_DATA,
  ON_CHANGE,
  ON_REMOVE_LIST_FIELD,
  ON_RESET,
  ON_SUBMIT,
  REMOVE_FIELD,
  REMOVE_RELATION,
  REORDER_DIFF_ROW,
  REORDER_ROW,
  RESET_PROPS,
  SET_LIST_FIELD_TO_EDIT_INDEX,
  SUBMIT_SUCCEEDED,
} from './constants';
import { formatLayout as updateLayout, createLayout } from '../../utils/layout';

export function addFieldToList(field) {
  return {
    type: ADD_FIELD_TO_LIST,
    field,
  };
}

export function addRelation(name) {
  return {
    type: ADD_RELATION,
    name,
  };
}

export function formatLayout() {
  return {
    type: FORMAT_LAYOUT,
  };
}

export function getData(uid, source) {
  return {
    type: GET_DATA,
    uid,
    source,
  };
}

export function getDataSucceeded(layout) {
  set(
    layout,
    ['layouts', 'edit'],
    updateLayout(createLayout(layout.layouts.edit))
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

export function moveRelation(dragIndex, hoverIndex) {
  return {
    type: MOVE_RELATION,
    dragIndex,
    hoverIndex,
  };
}

export function moveRow(dragRowIndex, hoverRowIndex) {
  return {
    type: MOVE_ROW,
    dragRowIndex,
    hoverRowIndex,
  };
}

export function onAddData(name) {
  return {
    type: ON_ADD_DATA,
    name,
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

export function removeField(rowIndex, fieldIndex) {
  return {
    type: REMOVE_FIELD,
    rowIndex,
    fieldIndex,
  };
}

export function removeRelation(index) {
  return {
    type: REMOVE_RELATION,
    index,
  };
}

export function reorderDiffRow(
  dragIndex,
  hoverIndex,
  dragRowIndex,
  hoverRowIndex
) {
  return {
    type: REORDER_DIFF_ROW,
    dragIndex,
    hoverIndex,
    dragRowIndex,
    hoverRowIndex,
  };
}

export function reorderRow(dragRowIndex, dragIndex, hoverIndex) {
  return {
    type: REORDER_ROW,
    dragRowIndex,
    dragIndex,
    hoverIndex,
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

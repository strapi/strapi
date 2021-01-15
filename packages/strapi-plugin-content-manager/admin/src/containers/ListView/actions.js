import {
  GET_DATA,
  GET_DATA_SUCCEEDED,
  ON_CHANGE_BULK,
  ON_CHANGE_BULK_SELECT_ALL,
  ON_CHANGE_LIST_HEADERS,
  ON_RESET_LIST_HEADERS,
  ON_DELETE_DATA_ERROR,
  ON_DELETE_DATA_SUCCEEDED,
  ON_DELETE_SEVERAL_DATA_SUCCEEDED,
  RESET_PROPS,
  SET_LIST_LAYOUT,
  SET_MODAL_LOADING_STATE,
  TOGGLE_MODAL_DELETE,
  TOGGLE_MODAL_DELETE_ALL,
} from './constants';

export const getData = () => ({ type: GET_DATA });

export const getDataSucceeded = (pagination, data) => ({
  type: GET_DATA_SUCCEEDED,
  pagination,
  data,
});

export function onChangeBulk({ target: { name } }) {
  return {
    type: ON_CHANGE_BULK,
    name,
  };
}

export function onChangeBulkSelectall() {
  return {
    type: ON_CHANGE_BULK_SELECT_ALL,
  };
}

export function onDeleteDataError() {
  return {
    type: ON_DELETE_DATA_ERROR,
  };
}

export function onDeleteDataSucceeded() {
  return {
    type: ON_DELETE_DATA_SUCCEEDED,
  };
}

export function onDeleteSeveralDataSucceeded() {
  return {
    type: ON_DELETE_SEVERAL_DATA_SUCCEEDED,
  };
}

export const onResetListHeaders = () => ({ type: ON_RESET_LIST_HEADERS });

export function resetProps() {
  return { type: RESET_PROPS };
}

export function setModalLoadingState() {
  return {
    type: SET_MODAL_LOADING_STATE,
  };
}

export function toggleModalDeleteAll() {
  return {
    type: TOGGLE_MODAL_DELETE_ALL,
  };
}

export function toggleModalDelete() {
  return {
    type: TOGGLE_MODAL_DELETE,
  };
}

export const setLayout = layout => ({ layout, type: SET_LIST_LAYOUT });

export const onChangeListHeaders = target => ({ type: ON_CHANGE_LIST_HEADERS, target });

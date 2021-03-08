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

export const setLayout = contentType => {
  const { layouts, settings } = contentType;
  const defaultSort = `${settings.defaultSortBy}:${settings.defaultSortOrder}`;

  return {
    contentType,
    displayedHeaders: layouts.list,
    type: SET_LIST_LAYOUT,
    // initParams needs to explicitly set in the action so that external
    // plugin can override this one.
    // For instance, the i18n plugin will catch this action in a middleware and enhance it with a "locale" key
    initialParams: {
      page: 1,
      pageSize: settings.pageSize,
      _sort: defaultSort,
    },
  };
};

export const onChangeListHeaders = target => ({ type: ON_CHANGE_LIST_HEADERS, target });

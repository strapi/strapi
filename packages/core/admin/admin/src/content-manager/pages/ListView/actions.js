import {
  GET_DATA,
  GET_DATA_SUCCEEDED,
  ON_CHANGE_LIST_HEADERS,
  ON_RESET_LIST_HEADERS,
  RESET_PROPS,
  SET_LIST_LAYOUT,
} from './constants';

export const getData = () => ({ type: GET_DATA });

export const getDataSucceeded = (pagination, data) => ({
  type: GET_DATA_SUCCEEDED,
  pagination,
  data,
});

export const onResetListHeaders = () => ({ type: ON_RESET_LIST_HEADERS });

export function resetProps() {
  return { type: RESET_PROPS };
}

export const setLayout = contentType => {
  const { layouts } = contentType;

  return {
    contentType,
    displayedHeaders: layouts.list,
    type: SET_LIST_LAYOUT,
  };
};

export const onChangeListHeaders = target => ({ type: ON_CHANGE_LIST_HEADERS, target });

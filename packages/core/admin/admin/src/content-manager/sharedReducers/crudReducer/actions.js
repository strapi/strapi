import {
  CLEAR_SET_MODIFIED_DATA_ONLY,
  GET_DATA,
  GET_DATA_SUCCEEDED,
  INIT_FORM,
  RESET_PROPS,
  SET_DATA_STRUCTURES,
  SET_STATUS,
  SUBMIT_SUCCEEDED,
} from './constants';

export const getData = () => {
  return {
    type: GET_DATA,
  };
};

export const getDataSucceeded = (data) => ({
  type: GET_DATA_SUCCEEDED,
  data,
});

export const initForm = (rawQuery, isSingleType = false) => ({
  type: INIT_FORM,
  rawQuery,
  isSingleType,
});

export const resetProps = () => ({ type: RESET_PROPS });

export const setDataStructures = (componentsDataStructure, contentTypeDataStructure) => ({
  type: SET_DATA_STRUCTURES,
  componentsDataStructure,
  contentTypeDataStructure,
});

export const setStatus = (status) => ({
  type: SET_STATUS,
  status,
});

export const submitSucceeded = (data) => ({
  type: SUBMIT_SUCCEEDED,
  data,
});

export const clearSetModifiedDataOnly = () => ({
  type: CLEAR_SET_MODIFIED_DATA_ONLY,
});

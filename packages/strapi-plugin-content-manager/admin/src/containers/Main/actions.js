import { GET_DATA, GET_DATA_SUCCEEDED, RESET_PROPS } from './constants';

export const getData = () => ({
  type: GET_DATA,
});

export const getDataSucceeded = (models, components) => ({
  type: GET_DATA_SUCCEEDED,
  components,
  models,
});

export const resetProps = () => ({ type: RESET_PROPS });

import { GET_DATA, GET_DATA_SUCCEEDED } from './constants';

export function getData() {
  return {
    type: GET_DATA,
  };
}

export function getDataSucceeded(generalSettings, groups, models) {
  return {
    type: GET_DATA_SUCCEEDED,
    generalSettings,
    groups,
    models,
  };
}

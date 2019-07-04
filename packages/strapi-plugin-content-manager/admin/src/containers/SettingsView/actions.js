import { GET_DATA, GET_DATA_SUCCEEDED, ON_CHANGE } from './constants';

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

export function onChange({ target: { name, value } }) {
  return {
    type: ON_CHANGE,
    name,
    value,
  };
}

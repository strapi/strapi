import {
  GET_DATA,
  GET_DATA_SUCCEEDED,
  ON_CHANGE,
  ON_RESET,
  ON_SUBMIT,
  SUBMIT_SUCCEEDED,
} from './constants';

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
    models: models.filter(model => model.isDisplayed === true),
  };
}

export function onChange({ target: { name, value } }) {
  return {
    type: ON_CHANGE,
    name,
    value,
  };
}

export function onReset() {
  return {
    type: ON_RESET,
  };
}

export function onSubmit() {
  return {
    type: ON_SUBMIT,
  };
}

export function submitSucceeded() {
  return {
    type: SUBMIT_SUCCEEDED,
  };
}

/*
 *
 * HomePage actions
 *
 */
import { Map } from 'immutable';

import {
  CANCEL_CHANGES,
  DELETE_DATA,
  DELETE_DATA_SUCCEEDED,
  FETCH_DATA,
  FETCH_DATA_SUCCEEDED,
  ON_CHANGE,
  SET_FORM,
  SUBMIT,
  SUBMIT_SUCCEEDED,
} from './constants';

export function cancelChanges() {
  return {
    type: CANCEL_CHANGES,
  };
}

export function deleteData(dataToDelete, deleteEndPoint) {
  return {
    type: DELETE_DATA,
    dataToDelete,
    deleteEndPoint,
  };
}

export function deleteDataSucceeded(indexDataToDelete) {
  return {
    type: DELETE_DATA_SUCCEEDED,
    indexDataToDelete,
  };
}

export function fetchData(endPoint) {
  return {
    type: FETCH_DATA,
    endPoint,
  };
}

export function fetchDataSucceeded(data) {
  return {
    type: FETCH_DATA_SUCCEEDED,
    data,
  };
}

export function onChange({ target }) {
  return {
    type: ON_CHANGE,
    keys: ['modifiedData'].concat(target.name.split('.')),
    value: target.value,
  };
}

export function setForm(data) {
  // const form = generateForm(formType);
  return {
    type: SET_FORM,
    form: Map(data),
  };
}

export function submit(endPoint) {
  return {
    type: SUBMIT,
    endPoint,
  };
}

export function submitSucceeded() {
  return {
    type: SUBMIT_SUCCEEDED,
  };
}

// Utils

// function generateForm(formType) {
//   let form = Map({});
//   switch (formType) {
//     case 'providers':
//       form = Map({
//         provider: 'Facebook',
//         enabled: false,
//       });
//       break;
//     case 'email-templates':
//       form = Map({
//         shipperName: '',
//         shipperEmail: '',
//         responseEmail: '',
//         emailObject: '',
//         message: '',
//       });
//       break;
//     case 'advanced-settings':
//       form = Map({
//         uniqueAccount: false,
//         subscriptions: '100',
//         durations: '24',
//       });
//       break;
//     default:
//   }
//
//   return form;
// }

/*
 *
 * Form actions
 *
 */

import { map } from 'lodash';
import {
  DEFAULT_ACTION,
  SET_FORM,
} from './constants';
import forms from './forms.json';

export function defaultAction() {
  return {
    type: DEFAULT_ACTION,
  };
}

export function setForm(hash) {
  const form = forms[hash.split('::')[1]][hash.split('::')[2]];
  const data = getDataFromForm(forms[hash.split('::')[1]]);
  return {
    type: SET_FORM,
    form,
    data,
  };
}


function getDataFromForm(form) {
  const data = {};
  map(form, (formSection) => {
    map(formSection.items, (item) => {
      data[item.target] = item.value;
    });
  });
  return data;
}

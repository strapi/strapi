/*
 *
 * Form actions
 *
 */

 /* eslint-disable new-cap */

import { map , forEach} from 'lodash';
import { Map, List } from 'immutable';

import {
  SET_FORM,
  CONNECTIONS_FETCH,
  CONNECTIONS_FETCH_SUCCEEDED,
} from './constants';

import forms from './forms.json';

export function connectionsFetch() {
  return {
    type: CONNECTIONS_FETCH,
  };
}

export function connectionsFetchSucceeded(data) {
  const connections = map(data.connections, (connection) => ({ name: connection, value: connection }))
  return {
    type: CONNECTIONS_FETCH_SUCCEEDED,
    connections,
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


/**
*
* @param  {object} form
* @return {object} data : An object { target: value }
*/

function getDataFromForm(form) {
  const dataArray = [['attributes', List()]];

  forEach(form, (formSection) => {
    map(formSection.items, (item) => dataArray.push([item.target, item.value]));
  });

  const data = Map(dataArray);

  return data;
}

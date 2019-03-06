/*
 *
 * App actions
 *
 */
import { pick, set } from 'lodash';
import {
  GET_DATA,
  GET_DATA_SUCCEEDED,
} from './constants';

export function getData() {
  return {
    type: GET_DATA,
  };
}

export function getDataSucceeded({ allModels, models }) {
  const initialData = allModels.reduce((acc, current) => {
    acc[current.name] = pick(current, ['name', 'collectionName', 'connection', 'description', 'mainField']);
    const attributes = buildModelAttributes(current.attributes);
    set(acc, [current.name, 'attributes'], attributes);

    return acc;
  }, {});

  return {
    type: GET_DATA_SUCCEEDED,
    initialData,
    models,
  };
}


// utils

export const buildModelAttributes = (attributes) => {
  const formattedAttributes = attributes.reduce((acc, current) => {
    acc[current.name] = current.params;

    return acc;
  }, {});

  return formattedAttributes;
};

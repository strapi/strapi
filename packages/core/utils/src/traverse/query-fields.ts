import { curry, isArray, isString, eq, trim, constant } from 'lodash/fp';

import traverseFactory from './factory';

const isStringArray = (value: unknown): value is string[] => {
  return isArray(value) && value.every(isString);
};

const fields = traverseFactory()
  // Intercept array of strings
  // e.g. fields=['title', 'description']
  .intercept(isStringArray, async (visitor, options, fields, { recurse }) => {
    return Promise.all(fields.map((field) => recurse(visitor, options, field)));
  })
  // Intercept comma separated fields (as string)
  // e.g. fields='title,description'
  .intercept(
    (value): value is string => isString(value) && value.includes(','),
    (visitor, options, fields, { recurse }) => {
      return Promise.all(fields.split(',').map((field) => recurse(visitor, options, field)));
    }
  )
  // Return wildcards as is
  .intercept((value): value is string => eq('*', value), constant('*'))
  // Parse string values
  // Since we're parsing strings only, each value should be an attribute name (and it's value, undefined),
  // thus it shouldn't be possible to set a new value, and get should return the whole data if key === data
  .parse(isString, () => ({
    transform: trim,

    remove(key, data) {
      return data === key ? undefined : data;
    },

    set(_key, _value, data) {
      return data;
    },

    keys(data) {
      return [data];
    },

    get(key, data) {
      return key === data ? data : undefined;
    },
  }));

export default curry(fields.traverse);

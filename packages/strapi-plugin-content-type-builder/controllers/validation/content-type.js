'use strict';

const _ = require('lodash');
const formatYupErrors = require('./yup-formatter');

const createSchema = require('./model-schema');
const { modelTypes } = require('./constants');

const VALID_RELATIONS = [
  'oneWay',
  'manyWay',
  'oneToOne',
  'oneToMany',
  'manyToOne',
  'manyToMany',
];
const VALID_TYPES = [
  // advanced types
  'media',

  // scalar types
  'string',
  'text',
  'richtext',
  'json',
  'enumeration',
  'password',
  'email',
  'integer',
  'biginteger',
  'float',
  'decimal',
  'date',
  'boolean',

  // nested component
  'component',
  'dynamiczone',
];

const validateContentTypeInput = data => {
  return createSchema(VALID_TYPES, VALID_RELATIONS, {
    modelType: modelTypes.CONTENT_TYPE,
  })
    .validate(data, {
      strict: true,
      abortEarly: false,
    })
    .catch(error => Promise.reject(formatYupErrors(error)));
};

const validateUpdateContentTypeInput = data => {
  // convert zero length string on default attributes to undefined
  if (_.has(data, 'attributes')) {
    Object.keys(data.attributes).forEach(attribute => {
      if (data.attributes[attribute].default === '') {
        data.attributes[attribute].default = undefined;
      }
    });
  }

  return createSchema(VALID_TYPES, VALID_RELATIONS, {
    modelType: modelTypes.CONTENT_TYPE,
  })
    .validate(data, {
      strict: true,
      abortEarly: false,
    })
    .catch(error => Promise.reject(formatYupErrors(error)));
};

module.exports = {
  validateContentTypeInput,
  validateUpdateContentTypeInput,
};

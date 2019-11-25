'use strict';

const _ = require('lodash');
const yup = require('yup');
const formatYupErrors = require('./yup-formatter');

const createSchema = require('./model-schema');
const { nestedComponentSchema } = require('./component');
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

const contentTypeSchema = createSchema(VALID_TYPES, VALID_RELATIONS, {
  modelType: modelTypes.CONTENT_TYPE,
});

const createContentTypeSchema = yup
  .object({
    contentType: contentTypeSchema.required().noUnknown(),
    components: nestedComponentSchema,
  })
  .noUnknown();

const validateContentTypeInput = data => {
  return createContentTypeSchema
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

  if (_.has(data, 'components') && Array.isArray(data.components)) {
    data.components.forEach(data => {
      if (_.has(data, 'attributes') && _.has(data, 'uid')) {
        Object.keys(data.attributes).forEach(attribute => {
          if (data.attributes[attribute].default === '') {
            data.attributes[attribute].default = undefined;
          }
        });
      }
    });
  }

  return createContentTypeSchema
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

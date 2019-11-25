'use strict';

const _ = require('lodash');
const yup = require('yup');

const { isValidName } = require('./common');
const formatYupErrors = require('./yup-formatter');
const createSchema = require('./model-schema');
const { modelTypes } = require('./constants');

const VALID_RELATIONS = ['oneWay', 'manyWay'];
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
];

const componentSchema = createSchema(VALID_TYPES, VALID_RELATIONS, {
  modelType: modelTypes.COMPONENT,
}).shape({
  icon: yup
    .string()
    .nullable()
    .test(isValidName)
    .required('icon.required'),
  category: yup
    .string()
    .nullable()
    .test(isValidName)
    .required('category.required'),
});

const nestedComponentSchema = yup.array().of(
  componentSchema
    .shape({
      uid: yup.string(),
      tmpUID: yup.string(),
    })
    .test({
      name: 'mustHaveUIDOrTmpUID',
      message: 'Component must have a uid or a tmpUID',
      test: attr => {
        if (_.has(attr, 'uid') && _.has(attr, 'tmpUID')) return false;
        if (!_.has(attr, 'uid') && !_.has(attr, 'tmpUID')) return false;
        return true;
      },
    })
    .required()
);

const createComponentSchema = () => {
  return yup
    .object({
      component: componentSchema.required().noUnknown(),
      components: nestedComponentSchema,
    })
    .noUnknown();
};

const validateComponentInput = data => {
  return createComponentSchema()
    .validate(data, {
      strict: true,
      abortEarly: false,
    })
    .catch(error => Promise.reject(formatYupErrors(error)));
};

const validateUpdateComponentInput = data => {
  // convert zero length string on default attributes to undefined
  if (_.has(data, ['component', 'attributes'])) {
    Object.keys(data.component.attributes).forEach(attribute => {
      if (data.component.attributes[attribute].default === '') {
        data.component.attributes[attribute].default = undefined;
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

  return createComponentSchema()
    .validate(data, {
      strict: true,
      abortEarly: false,
    })
    .catch(error => Promise.reject(formatYupErrors(error)));
};

module.exports = {
  validateComponentInput,
  validateUpdateComponentInput,
  componentSchema,
  nestedComponentSchema,
};

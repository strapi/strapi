'use strict';

const yup = require('yup');
const _ = require('lodash');
const formatYupErrors = require('./yup-formatter');

const { isValidName, isValidKey } = require('./common');
const { getTypeShape } = require('./types');
const getRelationValidator = require('./relations');

const VALID_COMPONENT_RELATIONS = ['oneWay', 'manyWay'];
const VALID_COMPONENT_TYPES = [
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

const validateComponentInput = data => {
  return componentSchema
    .validate(data, {
      strict: true,
      abortEarly: false,
    })
    .catch(error => Promise.reject(formatYupErrors(error)));
};

const validateUpdateComponentInput = data => {
  // convert zero length string on default attributes to undefined
  if (_.has(data, 'attributes')) {
    Object.keys(data.attributes).forEach(attribute => {
      if (data.attributes[attribute].default === '') {
        data.attributes[attribute].default = undefined;
      }
    });
  }

  return componentSchema
    .validate(data, {
      strict: true,
      abortEarly: false,
    })
    .catch(error => Promise.reject(formatYupErrors(error)));
};

const componentSchema = yup
  .object({
    name: yup
      .string()
      .min(1)
      .required('name.required'),
    icon: yup
      .string()
      .test(isValidName)
      .required('icon.required'),
    category: yup
      .string()
      .min(3)
      .test(isValidName)
      .required('category.required'),
    description: yup.string(),
    connection: yup.string(),
    collectionName: yup
      .string()
      .nullable()
      .test(isValidName),
    attributes: yup.lazy(obj => {
      return yup
        .object()
        .shape(
          _.mapValues(obj, (value, key) => {
            return yup.lazy(obj => {
              let shape;
              if (_.has(obj, 'type')) {
                shape = {
                  type: yup
                    .string()
                    .oneOf(VALID_COMPONENT_TYPES)
                    .required(),
                  ...getTypeShape(obj),
                };
              } else if (_.has(obj, 'target')) {
                shape = getRelationValidator(obj, VALID_COMPONENT_RELATIONS);
              } else {
                return yup.object().test({
                  name: 'mustHaveTypeOrTarget',
                  message: 'Attribute must have either a type or a target',
                  test: () => false,
                });
              }

              return yup
                .object()
                .shape(shape)
                .test(isValidKey(key))
                .noUnknown();
            });
          })
        )
        .required('attributes.required');
    }),
  })
  .noUnknown();

module.exports = {
  validateComponentInput,
  validateUpdateComponentInput,
};

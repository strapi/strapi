'use strict';

const yup = require('yup');
const _ = require('lodash');
const formatYupErrors = require('./yup-formatter');

const { isValidName, isValidKey } = require('./common');
const getTypeValidator = require('./types');
const getRelationValidator = require('./relations');

module.exports = data => {
  return groupSchema
    .validate(data, {
      strict: true,
      abortEarly: false,
    })
    .catch(error => Promise.reject(formatYupErrors(error)));
};

const groupSchema = yup
  .object({
    name: yup
      .string()
      .min(1)
      .test(isValidName)
      .required('name.required'),
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
                shape = getTypeValidator(obj);
              } else if (_.has(obj, 'target')) {
                shape = getRelationValidator(obj);
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

'use strict';

const _ = require('lodash');

const { yup } = require('strapi-utils');

/**
 * Utility function to compose validators
 */
const composeValidators = (...fns) => attr => {
  return fns.reduce((validator, fn) => {
    return fn(attr, validator);
  }, yup.mixed());
};

/* minLength validator */
const addMinLengthValidator = ({ minLength }, validator) =>
  _.isInteger(minLength) ? validator.min(minLength) : validator;

/* maxLength validator */
const addMaxLengthValidator = ({ maxLength }, validator) =>
  _.isInteger(maxLength) ? validator.max(maxLength) : validator;

/* string validator */
const stringValidator = composeValidators(
  () => yup.string().nullable(),
  addMinLengthValidator,
  addMaxLengthValidator
);

const enumerationValidator = attr => {
  return yup
    .string()
    .nullable()
    .oneOf(Array.isArray(attr.enum) ? attr.enum : [attr.enum]);
};

const emailValidator = composeValidators(stringValidator, (attr, validator) => validator.email());

const minIntegerValidator = ({ min }, validator) =>
  _.isNumber(min) ? validator.min(_.toInteger(min)) : validator;

const maxIntegerValidator = ({ max }, validator) =>
  _.isNumber(max) ? validator.max(_.toInteger(max)) : validator;

const integerValidator = composeValidators(
  () =>
    yup
      .number()
      .integer()
      .nullable(),
  minIntegerValidator,
  maxIntegerValidator
);

const minFloatValidator = ({ min }, validator) =>
  _.isNumber(min) ? validator.min(min) : validator;

const maxFloatValidator = ({ max }, validator) =>
  _.isNumber(max) ? validator.max(max) : validator;

const floatValidator = composeValidators(
  () => yup.number().nullable(),
  minFloatValidator,
  maxFloatValidator
);

const uidValidator = composeValidators(stringValidator, (attr, validator) =>
  validator.matches(new RegExp('^[A-Za-z0-9-_.~]*$'))
);

module.exports = {
  string: stringValidator,
  text: stringValidator,
  richtext: stringValidator,
  password: stringValidator,
  email: emailValidator,
  enumeration: enumerationValidator,
  boolean: () => yup.boolean().nullable(),
  uid: uidValidator,
  json: () => yup.mixed(),
  integer: integerValidator,
  biginteger: () => yup.mixed(),
  float: floatValidator,
  decimal: floatValidator,
  date: () => yup.mixed(),
  time: () => yup.mixed(),
  datetime: () => yup.mixed(),
  timestamp: () => yup.mixed(),
};

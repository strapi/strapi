'use strict';

const _ = require('lodash');

const { yup } = require('strapi-utils');

/**
 * Utility function to compose validators
 */
const composeValidators = (...fns) => (attr, { isDraft }) => {
  return fns.reduce((validator, fn) => {
    return fn(attr, validator, { isDraft });
  }, yup.mixed());
};

/* Validator utils */

/**
 * Adds minLength validator
 * @param {Object} attribute model attribute
 * @param {Object} validator yup validator
 */
const addMinLengthValidator = ({ minLength }, validator, { isDraft }) =>
  _.isInteger(minLength) && !isDraft ? validator.min(minLength) : validator;

/**
 * Adds maxLength validator
 * @param {Object} attribute model attribute
 * @param {Object} validator yup validator
 */
const addMaxLengthValidator = ({ maxLength }, validator) =>
  _.isInteger(maxLength) ? validator.max(maxLength) : validator;

/**
 * Adds min integer validator
 * @param {Object} attribute model attribute
 * @param {Object} validator yup validator
 */
const addMinIntegerValidator = ({ min }, validator) =>
  _.isNumber(min) ? validator.min(_.toInteger(min)) : validator;

/**
 * Adds max integer validator
 * @param {Object} attribute model attribute
 * @param {Object} validator yup validator
 */
const addMaxIntegerValidator = ({ max }, validator) =>
  _.isNumber(max) ? validator.max(_.toInteger(max)) : validator;

/**
 * Adds min float/decimal validator
 * @param {Object} attribute model attribute
 * @param {Object} validator yup validator
 */
const addMinFloatValidator = ({ min }, validator) =>
  _.isNumber(min) ? validator.min(min) : validator;

/**
 * Adds max float/decimal validator
 * @param {Object} attribute model attribute
 * @param {Object} validator yup validator
 */
const addMaxFloatValidator = ({ max }, validator) =>
  _.isNumber(max) ? validator.max(max) : validator;

/**
 * Adds regex validator
 * @param {Object} attribute model attribute
 * @param {Object} validator yup validator
 */
const addStringRegexValidator = ({ regex }, validator) =>
  _.isUndefined(regex) ? validator : validator.matches(new RegExp(regex));

/* Type validators */

const stringValidator = composeValidators(
  () => yup.string().transform((val, originalVal) => originalVal),
  addMinLengthValidator,
  addMaxLengthValidator,
  addStringRegexValidator
);

const emailValidator = composeValidators(stringValidator, (attr, validator) => validator.email());

const uidValidator = composeValidators(stringValidator, (attr, validator) =>
  validator.matches(new RegExp('^[A-Za-z0-9-_.~]*$'))
);

const enumerationValidator = attr => {
  return yup.string().oneOf((Array.isArray(attr.enum) ? attr.enum : [attr.enum]).concat(null));
};

const integerValidator = composeValidators(
  () => yup.number().integer(),
  addMinIntegerValidator,
  addMaxIntegerValidator
);

const floatValidator = composeValidators(
  () => yup.number(),
  addMinFloatValidator,
  addMaxFloatValidator
);

module.exports = {
  string: stringValidator,
  text: stringValidator,
  richtext: stringValidator,
  password: stringValidator,
  email: emailValidator,
  enumeration: enumerationValidator,
  boolean: () => yup.boolean(),
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

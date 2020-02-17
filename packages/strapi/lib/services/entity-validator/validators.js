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

module.exports = {
  string: stringValidator,
};

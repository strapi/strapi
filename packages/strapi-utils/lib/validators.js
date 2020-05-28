'use strict';

const yup = require('yup');
const _ = require('lodash');

const isNotNilTest = value => !_.isNil(value);

function isNotNill(msg = '${path} must be defined.') {
  return this.test('defined', msg, isNotNilTest);
}

const isNotNullTest = value => !_.isNull(value);
function isNotNull(msg = '${path} cannot be null.') {
  return this.test('defined', msg, isNotNullTest);
}

function arrayRequiredAllowEmpty(message) {
  return this.test('field is required', message || '', value => _.isArray(value));
}

yup.addMethod(yup.mixed, 'notNil', isNotNill);
yup.addMethod(yup.mixed, 'notNull', isNotNull);
yup.addMethod(yup.array, 'requiredAllowEmpty', arrayRequiredAllowEmpty);

/**
 * Returns a formatted error for http responses
 * @param {Object} validationError - a Yup ValidationError
 */
const formatYupErrors = validationError => {
  if (!validationError.inner) {
    throw new Error('invalid.input');
  }

  if (validationError.inner.length === 0) {
    if (validationError.path === undefined) return validationError.errors;
    return { [validationError.path]: validationError.errors };
  }

  return validationError.inner.reduce((acc, err) => {
    acc[err.path] = err.errors;
    return acc;
  }, {});
};

module.exports = {
  yup,
  formatYupErrors,
};

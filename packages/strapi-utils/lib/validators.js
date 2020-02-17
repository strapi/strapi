'use strict';

const yup = require('yup');
const _ = require('lodash');

const isNotNil = value => !_.isNil(value);

function isDefined(msg = '${path} must be defined.') {
  return this.test('defined', msg, isNotNil);
}

yup.addMethod(yup.mixed, 'defined', isDefined);

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

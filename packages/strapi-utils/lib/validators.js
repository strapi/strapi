'use strict';

const yup = require('yup');
const _ = require('lodash');

yup.addMethod(yup.mixed, 'defined', function(msg = '${path} must be defined') {
  return this.test('defined', msg, value => !_.isNil(value));
});

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

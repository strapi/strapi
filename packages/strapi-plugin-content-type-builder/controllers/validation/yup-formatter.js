'use strict';

/**
 * Returns a formatted error for http responses
 * @param {Object} validationError - a Yup ValidationError
 */
const formatYupErrors = validationError => {
  if (validationError.inner.length === 0) {
    if (validationError.path === undefined) return validationError.errors;
    return { [validationError.path]: validationError.errors };
  }

  return validationError.inner.reduce((acc, err) => {
    acc[err.path] = err.errors;
    return acc;
  }, {});
};

module.exports = formatYupErrors;

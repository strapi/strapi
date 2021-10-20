'use strict';

const { isEmpty } = require('lodash/fp');

// Temporary fix of this issue : https://github.com/jquense/yup/issues/616
const sanitizeErrorMessage = message =>
  message.replace(
    `\n If "null" is intended as an empty value be sure to mark the schema as \`.nullable()\``,
    ''
  );

const formatYupInnerError = yupError => ({
  path: yupError.path
    .replace(/\[/g, '.')
    .replace(/]/g, '')
    .split('.'),
  message: sanitizeErrorMessage(yupError.message),
  name: yupError.name,
});

const formatYupErrors = yupError => ({
  errors: isEmpty(yupError.inner)
    ? [formatYupInnerError(yupError)]
    : yupError.inner.map(formatYupInnerError),
  message: sanitizeErrorMessage(yupError.message),
});

module.exports = {
  formatYupErrors,
};

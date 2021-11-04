'use strict';

const { isEmpty, toPath } = require('lodash/fp');

const formatYupInnerError = yupError => ({
  path: toPath(yupError.path),
  message: yupError.message,
  name: yupError.name,
});

const formatYupErrors = yupError => ({
  errors: isEmpty(yupError.inner)
    ? [formatYupInnerError(yupError)]
    : yupError.inner.map(formatYupInnerError),
  message: yupError.message,
});

module.exports = {
  formatYupErrors,
};

'use strict';

const formatGraphqlError = error => {
  delete error.extensions.code;

  return error;
};

module.exports = formatGraphqlError;

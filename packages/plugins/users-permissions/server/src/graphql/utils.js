'use strict';

const { get } = require('lodash');

/**
 * Throws an ApolloError if context body contains a bad request
 * @param contextBody - body of the context object given to the resolver
 * @throws ApolloError if the body is a bad request
 */
function checkBadRequest(contextBody) {
  const statusCode = get(contextBody, 'statusCode', 200);

  if (statusCode !== 200) {
    const errorMessage = get(contextBody, 'error', 'Bad Request');

    const exception = new Error(errorMessage);

    exception.code = statusCode || 400;
    exception.data = contextBody;

    throw exception;
  }
}

module.exports = {
  checkBadRequest,
};

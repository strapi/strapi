'use strict';

const request = require('request-promise-native');

const createRequest = (defaults = {}) => {
  return request.defaults({
    baseUrl: 'http://localhost:1337',
    json: true,
    resolveWithFullResponse: true,
    simple: false,
    ...defaults,
  });
};

const createAuthRequest = token => {
  return createRequest({
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
};

module.exports = {
  createRequest,
  createAuthRequest,
};

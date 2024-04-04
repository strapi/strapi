'use strict';

const { createAgent } = require('./agent');
const { superAdmin } = require('./strapi');

const CONTENT_API_URL_PREFIX = '/api';

const createRequest = ({ strapi } = {}) => createAgent(strapi);

const createContentAPIRequest = ({ strapi, auth = {} } = {}) => {
  const { token } = auth;

  if (token) {
    return createAgent(strapi, { urlPrefix: CONTENT_API_URL_PREFIX, token });
  }

  // Default content api agent
  return createAgent(strapi, { urlPrefix: CONTENT_API_URL_PREFIX, token: 'test-token' });
};

const createAuthRequest = ({ strapi, userInfo = superAdmin.credentials, state = {} }) => {
  return createAgent(strapi, state).login(userInfo);
};

// TODO: Remove
const transformToRESTResource = (input) => {
  if (Array.isArray(input)) {
    return input.map((value) => transformToRESTResource(value));
  }

  return input;
};

module.exports = {
  createRequest,
  createContentAPIRequest,
  createAuthRequest,
  transformToRESTResource,
};

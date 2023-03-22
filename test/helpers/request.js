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

const createAuthRequest = ({ strapi, userInfo = superAdmin.credentials }) => {
  return createAgent(strapi).login(userInfo);
};

const transformToRESTResource = (input) => {
  if (Array.isArray(input)) {
    return input.map((value) => transformToRESTResource(value));
  }

  const { id, ...attributes } = input;
  return { id, attributes };
};

module.exports = {
  createRequest,
  createContentAPIRequest,
  createAuthRequest,
  transformToRESTResource,
};

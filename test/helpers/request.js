'use strict';

const { createAgent } = require('./agent');
const { superAdmin } = require('./strapi');

const createRequest = ({ strapi } = {}) => createAgent(strapi);
const createAuthRequest = ({ strapi, userInfo = superAdmin.credentials }) =>
  createAgent(strapi).login(userInfo);

const transformToRESTResource = input => {
  if (Array.isArray(input)) {
    return input.map(value => transformToRESTResource(value));
  }

  const { id, ...attributes } = input;
  return { id, attributes };
};

module.exports = {
  createRequest,
  createAuthRequest,
  transformToRESTResource,
};

'use strict';

const { createAgent } = require('./agent');
const { superAdmin } = require('./strapi');

const createRequest = ({ strapi } = {}) => createAgent(strapi);
const createAuthRequest = ({ strapi, userInfo = superAdmin.credentials }) =>
  createAgent(strapi).login(userInfo);

module.exports = {
  createRequest,
  createAuthRequest,
};

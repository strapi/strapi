'use strict';

const { mapValues } = require('lodash/fp');
const { PROVIDER_REDIRECT_ERROR, PROVIDER_REDIRECT_SUCCESS } = require('./constants');

const PROVIDER_URLS_MAP = {
  success: PROVIDER_REDIRECT_SUCCESS,
  error: PROVIDER_REDIRECT_ERROR,
};

const getAdminStore = async () => strapi.store({ type: 'core', environment: '', name: 'admin' });

const getPrefixedRedirectUrls = () => {
  const { host, port, path } = strapi.config.get('admin');

  let baseUrl = host || '';
  if (baseUrl && port) {
    baseUrl = `${baseUrl}:${port}`;
  }

  const prefixUrl = url => `${baseUrl}${path}${url}`;

  return mapValues(prefixUrl, PROVIDER_URLS_MAP);
};

module.exports = {
  getAdminStore,
  getPrefixedRedirectUrls,
};

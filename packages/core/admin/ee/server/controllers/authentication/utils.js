'use strict';

const { mapValues } = require('lodash/fp');
const { PROVIDER_REDIRECT_ERROR, PROVIDER_REDIRECT_SUCCESS } = require('./constants');

const PROVIDER_URLS_MAP = {
  success: PROVIDER_REDIRECT_SUCCESS,
  error: PROVIDER_REDIRECT_ERROR,
};

const getAdminStore = async () => strapi.store({ type: 'core', name: 'admin' });

const getPrefixedRedirectUrls = () => {
  const { url: adminUrl } = strapi.config.get('admin');
  const prefixUrl = url => `${adminUrl || ''}${url}`;

  return mapValues(prefixUrl, PROVIDER_URLS_MAP);
};

module.exports = {
  getAdminStore,
  getPrefixedRedirectUrls,
};

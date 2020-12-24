'use strict';

const { mapValues } = require('lodash/fp');
const { PROVIDER_REDIRECT_ERROR, PROVIDER_REDIRECT_SUCCESS } = require('./constants');

const getAdminStore = async () => strapi.store({ type: 'core', environment: '', name: 'admin' });

const getPrefixedRedirectUrls = () => {
  // TODO : Remove before merge
  return mapValues(url => `http://localhost:4000${strapi.config.admin.path}${url}`, {
    success: PROVIDER_REDIRECT_SUCCESS,
    error: PROVIDER_REDIRECT_ERROR,
  });
};

module.exports = {
  getAdminStore,
  getPrefixedRedirectUrls,
};

/* eslint-disable */

const injectReducer = require('./utils/injectReducer').default;
const useInjectReducer = require('./utils/injectReducer').useInjectReducer;
const injectSaga = require('./utils/injectSaga').default;
const useInjectSaga = require('./utils/injectSaga').useInjectSaga;
const { languages } = require('./i18n');

window.strapi = Object.assign(window.strapi || {}, {
  node: MODE || 'host',
  env: NODE_ENV,
  backendURL: BACKEND_URL === '/' ? window.location.origin : BACKEND_URL,
  languages,
  currentLanguage:
    window.localStorage.getItem('strapi-admin-language') ||
    window.navigator.language ||
    window.navigator.userLanguage ||
    'en',
  injectReducer,
  injectSaga,
  useInjectReducer,
  useInjectSaga,
});

module.exports = {
  'strapi-plugin-documentation': require('../../../strapi-plugin-documentation/admin/src').default,
  'strapi-plugin-users-permissions': require('../../../strapi-plugin-users-permissions/admin/src')
    .default,
  'strapi-plugin-content-manager': require('../../../strapi-plugin-content-manager/admin/src')
    .default,
  'strapi-plugin-content-type-builder': require('../../../strapi-plugin-content-type-builder/admin/src')
    .default,
  'strapi-plugin-email': require('../../../strapi-plugin-email/admin/src').default,
  'strapi-plugin-upload': require('../../../strapi-plugin-upload/admin/src').default,
  'strapi-plugin-graphql': require('../../../strapi-plugin-graphql/admin/src').default,
  'strapi-plugin-i18n': require('../../../strapi-plugin-i18n/admin/src').default,
};

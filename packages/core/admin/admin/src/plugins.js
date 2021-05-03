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
  // FIXME:
  // 'strapi-plugin-documentation': require('../../../../plugins/documentation/admin/src').default,
  // 'strapi-plugin-users-permissions': require('../../../../plugins/users-permissions/admin/src')
  //   .default,
  // 'strapi-plugin-content-manager': require('../../../content-manager/admin/src').default,
  // 'strapi-plugin-content-type-builder': require('../../../content-type-builder/admin/src').default,
  // 'strapi-plugin-email': require('../../../email/admin/src').default,
  // 'strapi-plugin-upload': require('../../../upload/admin/src').default,
  // 'strapi-plugin-graphql': require('../../../../plugins/graphql/admin/src').default,
  // 'strapi-plugin-i18n': require('../../../../plugins/i18n/admin/src').default,
};

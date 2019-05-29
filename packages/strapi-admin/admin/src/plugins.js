const injectReducer = require('./utils/injectReducer').default;
const injectSaga = require('./utils/injectSaga').default;
const { languages } = require('./i18n');

window.strapi = Object.assign(window.strapi || {}, {
  node: MODE || 'host',
  backendURL: BACKEND_URL === '/' ? window.location.origin : BACKEND_URL,
  languages,
  currentLanguage:
    window.localStorage.getItem('strapi-admin-language') ||
    window.navigator.language ||
    window.navigator.userLanguage ||
    'en',
  injectReducer,
  injectSaga,
});

module.exports = {
  'strapi-plugin-users-permissions': require('../../../strapi-plugin-users-permissions/admin/src')
    .default,
  'strapi-plugin-content-manager': require('../../../strapi-plugin-content-manager/admin/src')
    .default,
  'strapi-plugin-content-type-builder': require('../../../strapi-plugin-content-type-builder/admin/src')
    .default,
  'strapi-plugin-documentation': require('../../../strapi-plugin-documentation/admin/src')
    .default,
  'strapi-plugin-settings-manager': require('../../../strapi-plugin-settings-manager/admin/src')
    .default,
  'strapi-plugin-email': require('../../../strapi-plugin-email/admin/src')
    .default,
  'strapi-plugin-upload': require('../../../strapi-plugin-upload/admin/src')
    .default,
};

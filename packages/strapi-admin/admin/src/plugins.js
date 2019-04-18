// console.log(window);
const injectReducer = require('./utils/injectReducer').default;
const injectSaga = require('./utils/injectSaga').default;
const { languages } = require('./i18n');

window.strapi = Object.assign(window.strapi || {}, {
  node: MODE || 'host',
  backendURL: BACKEND_URL,
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
  // 'content-manager': require('../../../strapi-plugin-content-manager/admin/src')
  //   .default,
  'content-type-builder': require('../../../strapi-plugin-content-type-builder/admin/dist/strapi-plugin-content-type-builder.esm.js')
    .default,
  // 'content-type-builder': require('../../../strapi-plugin-content-type-builder/admin/src')
  //   .default,
  // require('../../../strapi-plugin')
  // .default,
  email: require('../../../strapi-plugin-email/admin/dist/strapi-plugin-email.esm.js')
    .default,
  'users-permissions': require('../../../strapi-plugin-users-permissions/admin/dist/strapi-users-permissions.esm.js')
    .default,
  // // 'settings-manager':
  // //   // 'settings-manager': require('../../../strapi-plugin-settings-manager/admin/src')
  // //   //   .default,
  // // require('../../../strapi-plugin-settings-manager/admin/dist/strapi-plugin-settings-manager.esm')
  // //   .default,
  // // upload: require('../../../strapi-plugin-upload/admin/src').default,
  upload: require('../../../strapi-plugin-upload/admin/dist/strapi-plugin-upload.esm.js')
    .default,
  // 'users-permissions': require('../../../strapi-plugin-users-permissions/admin/src')
  //   .default,
};

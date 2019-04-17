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

// const plugins = [
//   // 'content-manager',
//   // 'content-type-builder',
//   // 'email',
//   // 'settings-manager',
//   // 'upload',
//   'users-permissions',
// ].reduce((acc, curr) => {
//   const suffix =
//     process.env.NODE_ENV === 'development'
//       ? '/src'
//       : `dist/${current}.esm.min.js`;

//   acc[curr] = require(`../../../strapi-plugin-${current}/admin/${suffix}`);

//   return acc;
// });

// console.log(plugins);

// module.exports = {};
// module.exports = plugins;

module.exports = {
  // 'content-manager': require('../../../strapi-plugin-content-manager/admin/src')
  //   .default,
  // 'content-type-builder': require('../../../strapi-plugin-content-type-builder/admin/src')
  //   .default,
  // email: require('../../../strapi-plugin-email/admin/src').default,
  // 'settings-manager': require('../../../strapi-plugin-settings-manager/admin/src')
  //   .default,
  // upload: require('../../../strapi-plugin-upload/admin/src').default,
  upload: require('../../../strapi-plugin-upload/admin/dist/strapi-plugin-upload.esm.min.js')
    .default,
  // 'users-permissions': require('../../../strapi-plugin-users-permissions/admin/src')
  //   .default,
  'users-permissions': require('../../../strapi-plugin-users-permissions/admin/dist/strapi-users-permissions.esm.min.js')
    .default,
};

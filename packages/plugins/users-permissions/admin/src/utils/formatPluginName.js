import upperFirst from 'lodash/upperFirst';

function formatPluginName(pluginSlug) {
  switch (pluginSlug) {
    case 'application':
      return 'Application';
    case 'plugin::content-manager':
      return 'Content manager';
    case 'plugin::content-type-builder':
      return 'Content types builder';
    case 'plugin::documentation':
      return 'Documentation';
    case 'plugin::email':
      return 'Email';
    case 'plugin::i18n':
      return 'i18n';
    case 'plugin::upload':
      return 'Upload';
    case 'plugin::users-permissions':
      return 'Users-permissions';
    default:
      return upperFirst(pluginSlug.replace('api::', '').replace('plugin::', ''));
  }
}

export default formatPluginName;

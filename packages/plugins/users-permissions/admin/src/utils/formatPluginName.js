import upperFirst from 'lodash/upperFirst';

function formatPluginName(pluginSlug) {
  switch (pluginSlug) {
    case 'application':
      return 'Application';
    case 'content-manager':
      return 'Content manager';
    case 'content-type-builder':
      return 'Content types builder';
    case 'documentation':
      return 'Documentation';
    case 'email':
      return 'Email';
    case 'i18n':
      return 'i18n';
    case 'upload':
      return 'Upload';
    case 'users-permissions':
      return 'Users-permissions';
    default:
      return upperFirst(pluginSlug);
  }
}

export default formatPluginName;

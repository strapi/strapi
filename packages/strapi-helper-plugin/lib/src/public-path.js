const pluginPkg = require('../../../../package.json');
const pluginId = pluginPkg.name.replace(/^strapi-plugin-/i, '');
const publicPath = `plugins/${pluginId}/`;

__webpack_public_path__ = (() => {
  if (window.location.port === '4000') {
    return `${window.location.origin}/`;
  } else if (strapi.mode === 'backend') {
    return `${strapi.backendURL}/${publicPath}`;
  }

  return `${(strapi.remoteURL).replace(window.location.origin, '')}/${publicPath}`;
})();

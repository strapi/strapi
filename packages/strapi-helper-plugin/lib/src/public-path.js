const pluginPkg = require('../../../../package.json');
const pluginId = pluginPkg.name.replace(/^strapi-plugin-/i, '');
const publicPath = `plugins/${pluginId}/`;

__webpack_public_path__ = `${(strapi.remoteURL).replace(window.location.origin, '')}/${publicPath}`;

const pluginPkg = require('../../package.json');
const pluginId = pluginPkg.name.replace(/^strapi-plugin-/i, '');

module.exports = pluginId;

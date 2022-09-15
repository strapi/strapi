const pluginPkg = require('../../package.json');

const pluginId = pluginPkg.name.replace(/^(@[^-,.][\w,-]+\/|strapi-)plugin-/i, '');

module.exports = pluginId;

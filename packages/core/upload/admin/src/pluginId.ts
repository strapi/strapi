import pluginPkg from '../../package.json';

export const pluginId = pluginPkg.name.replace(/^@strapi\//i, '');

export default pluginId;

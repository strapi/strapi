import { name } from '../../package.json';

const pluginId = name.replace(/^@strapi\/plugin-/i, '');

export default pluginId;

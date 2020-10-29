import pluginId from '../pluginId';

const getTrad = (id, prefix = pluginId) => `${prefix}.${id}`;

export default getTrad;

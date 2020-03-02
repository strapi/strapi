import pluginId from '../pluginId';

const getRequestUrl = path => `/${pluginId}/${path}`;

export default getRequestUrl;

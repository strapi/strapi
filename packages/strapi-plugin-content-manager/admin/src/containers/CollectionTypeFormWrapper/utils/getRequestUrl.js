import pluginId from '../../../pluginId';

const getRequestUrl = path => `/${pluginId}/collection-types/${path}`;

export default getRequestUrl;

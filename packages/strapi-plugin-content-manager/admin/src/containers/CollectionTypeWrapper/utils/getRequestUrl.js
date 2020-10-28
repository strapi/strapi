import pluginId from '../../../pluginId';

const getRequestUrl = path => `/${pluginId}/explorer/${path}`;

export default getRequestUrl;

import pluginId from '../pluginId';

const getRequestURL = (endPoint) => `/${pluginId}/${endPoint}`;

export default getRequestURL;

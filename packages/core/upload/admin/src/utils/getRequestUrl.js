import pluginId from '../pluginId';

const getRequestUrl = (path) => {
  if (path.startsWith('/')) {
    return `/${pluginId}${path}`;
  }

  return `/${pluginId}/${path}`;
};

export default getRequestUrl;

import get from 'lodash/get';

const getLocaleFromQuery = query => {
  return get(query, 'query.pluginOptions.locale', undefined);
};

export default getLocaleFromQuery;

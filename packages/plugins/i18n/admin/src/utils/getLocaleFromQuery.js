import get from 'lodash/get';

const getLocaleFromQuery = (query) => {
  return get(query, 'plugins.i18n.locale', undefined);
};

export default getLocaleFromQuery;

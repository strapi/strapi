import get from 'lodash/get';

const getLocaleFromQuery = (query: any) => {
  return get(query, 'plugins.i18n.locale', undefined);
};

export default getLocaleFromQuery;

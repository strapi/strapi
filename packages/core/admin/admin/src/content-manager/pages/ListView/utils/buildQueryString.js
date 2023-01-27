import { stringify } from 'qs';
import set from 'lodash/set';
import createPluginsFilter from './createPluginsFilter';

/**
 * Creates a valid query string from an object of queryParams
 * This includes:
 * - a filters clause
 * - plugin options
 */
const buildQueryString = (queryParams = {}) => {
  /**
   * Extracting pluginOptions from the query since we don't want them to be part
   * of the url
   */
  const {
    plugins: _,
    _q: query,
    ...otherQueryParams
  } = {
    ...queryParams,
    ...createPluginsFilter(queryParams.plugins),
  };

  if (query) {
    set(otherQueryParams, `_q`, encodeURIComponent(query));
  }

  return `${stringify(otherQueryParams, {
    encode: false,
    addQueryPrefix: true,
  })}`;
};

export default buildQueryString;

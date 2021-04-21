import { stringify } from 'qs';
import createPluginsFilter from './createPluginsFilter';

/**
 * Creates a valid query string from an object of queryParams
 * This includes:
 * - a _where clause
 * - plugin options
 */
const buildQueryString = (queryParams = {}) => {
  const _where = queryParams._where || [];

  /**
   * Extracting pluginOptions from the query since we don't want them to be part
   * of the url
   */
  const { plugins: _, ...otherQueryParams } = {
    ...queryParams,
    _where,
    ...createPluginsFilter(queryParams.plugins),
  };

  return `?${stringify(otherQueryParams, { encode: false })}`;
};

export default buildQueryString;

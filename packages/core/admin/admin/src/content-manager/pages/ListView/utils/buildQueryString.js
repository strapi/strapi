import { stringify } from 'qs';
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
  const { plugins: _, ...otherQueryParams } = {
    ...queryParams,
    ...createPluginsFilter(queryParams.plugins),
  };

  return `?${stringify(otherQueryParams, { encode: false })}`;
};

export default buildQueryString;

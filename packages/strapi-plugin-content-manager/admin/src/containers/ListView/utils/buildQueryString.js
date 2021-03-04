import { stringify } from 'qs';
import arrayOfPluginOptions from './arrayOfPluginOptions';

/**
 * Creates a valid query string from an object of queryParams
 * This includes:
 * - a _where clause
 * - plugin options
 */
const buildQueryString = (queryParams = {}) => {
  const pluginOptionArray = arrayOfPluginOptions(queryParams.pluginOptions);
  const _where = queryParams._where || [];

  /**
   * Extracting pluginOptions from the query since we don't want them to be part
   * of the url
   */
  const { pluginOptions: _, ...otherQueryParams } = {
    ...queryParams,
    _where: _where.concat(pluginOptionArray),
  };

  return `?${stringify(otherQueryParams, { encode: false })}`;
};

export default buildQueryString;

import _ from 'lodash';

import type { Api, ApiInfo } from '../../../types';

/**
 * @description A reusable loop for building api endpoint paths and component schemas
 */
const loopContentTypeNames = (api: Api, callback: (info: ApiInfo) => any) => {
  let result = {};
  for (const contentTypeName of api.ctNames) {
    // Get the attributes found on the api's contentType
    const uid = `${api.getter}::${api.name}.${contentTypeName}`;

    const { attributes, info: contentTypeInfo, kind } = strapi.contentType(uid as any);

    // Get the routes for the current api
    const routeInfo =
      api.getter === 'plugin'
        ? // @ts-expect-error – TODO: fix this
          strapi.plugin(api.name).routes['content-api']
        : strapi.api(api.name).routes[contentTypeName];

    // Continue to next iteration if routeInfo is undefined
    if (!routeInfo) {
      continue;
    }

    // Uppercase the first letter of the api name
    const apiName = _.upperFirst(api.name);

    // Create a unique name if the api name and contentType name don't match
    const uniqueName =
      api.name === contentTypeName ? apiName : `${apiName} - ${_.upperFirst(contentTypeName)}`;

    const apiInfo = {
      ...api,
      routeInfo,
      attributes,
      uniqueName,
      contentTypeInfo,
      kind,
    };

    result = {
      ...result,
      ...callback(apiInfo),
    };
  }

  return result;
};

export default loopContentTypeNames;

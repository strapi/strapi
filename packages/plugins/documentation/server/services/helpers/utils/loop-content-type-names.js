'use strict';

const _ = require('lodash');

/**
 * @description A reusable loop for building api endpoint paths and component schemas
 *
 * @param {object} api - Api information to pass to the callback
 * @param {function} callback - Logic to execute for the given api
 *
 * @returns {object}
 */
const loopContentTypeNames = (api, callback) => {
  let result = {};
  for (const contentTypeName of api.ctNames) {
    // Get the attributes found on the api's contentType
    const uid = `${api.getter}::${api.name}.${contentTypeName}`;
    const { attributes, info: contentTypeInfo } = strapi.contentType(uid);

    // Get the routes for the current api
    const routeInfo =
      api.getter === 'plugin'
        ? strapi.plugin(api.name).routes['content-api']
        : strapi.api[api.name].routes[contentTypeName];

    // Continue to next iteration if routeInfo is undefined
    if (!routeInfo) continue;

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
    };

    result = {
      ...result,
      ...callback(apiInfo),
    };
  }

  return result;
};

module.exports = loopContentTypeNames;

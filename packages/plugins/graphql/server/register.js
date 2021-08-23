'use strict';

// const _ = require('lodash');
// const loadConfigs = require('./load-config');
//
// const attachMetadataToResolvers = (schema, { api, plugin }) => {
//   const { resolver = {} } = schema;
//   if (_.isEmpty(resolver)) return schema;
//
//   Object.keys(resolver).forEach(type => {
//     if (!_.isPlainObject(resolver[type])) return;
//
//     Object.keys(resolver[type]).forEach(resolverName => {
//       if (!_.isPlainObject(resolver[type][resolverName])) return;
//
//       resolver[type][resolverName]['_metadatas'] = {
//         api,
//         plugin,
//       };
//     });
//   });
//
//   return schema;
// };

// todo[v4]: Rework how we load additional gql schema / customize current schema
module.exports = async (/*{ strapi }*/) => {
  // const { appPath, installedPlugins } = strapi.config;
  //
  // // Load core utils.
  //
  // const { api, plugins, extensions } = await loadConfigs({
  //   appPath,
  //   installedPlugins,
  // });
  //
  // _.merge(strapi, { api, plugins });
  //
  // // Create a merge of all the GraphQL configuration.
  // const apisSchemas = Object.keys(strapi.api || {}).map(key => {
  //   const schema = _.get(strapi.api[key], 'config.schema.graphql', {});
  //   return attachMetadataToResolvers(schema, { api: key });
  // });
  //
  // const pluginsSchemas = Object.keys(strapi.plugins || {}).map(key => {
  //   const schema = _.get(strapi.plugins[key], 'config.schema.graphql', {});
  //   return attachMetadataToResolvers(schema, { plugin: key });
  // });
  //
  // const extensionsSchemas = Object.keys(extensions || {}).map(key => {
  //   const schema = _.get(extensions[key], 'config.schema.graphql', {});
  //   return attachMetadataToResolvers(schema, { plugin: key });
  // });
  //
  // const baseSchema = mergeSchemas([...pluginsSchemas, ...extensionsSchemas, ...apisSchemas]);
  //
  // // save the final schema in the plugin's config
  // _.set(strapi.plugins.graphql, 'config._schema.graphql', baseSchema);
};

/**
 * Merges a  list of schemas
 * @param {Array<Object>} schemas - The list of schemas to merge
 */
// const mergeSchemas = schemas => {
//   return schemas.reduce((acc, el) => {
//     const { definition, query, mutation, type, resolver } = el;
//
//     return _.merge(acc, {
//       definition: `${acc.definition || ''} ${definition || ''}`,
//       query: `${acc.query || ''} ${query || ''}`,
//       mutation: `${acc.mutation || ''} ${mutation || ''}`,
//       type,
//       resolver,
//     });
//   }, {});
// };

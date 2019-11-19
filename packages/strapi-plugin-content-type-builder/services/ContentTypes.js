'use strict';

const _ = require('lodash');

const getSchemaManager = require('./schema-manager');

/**
 * Creates a component and handle the nested components sent with it
 * @param {Object} params params object
 * @param {Object} params.component Main component to create
 * @param {Array<Object>} params.components List of nested components to created or edit
 */
const createContentType = ({ contentType, components = [] }) => {
  const componentsToCreate = components.filter(compo => !_.has(compo, 'uid'));
  const componentsToEdit = components.filter(compo => _.has(compo, 'uid'));

  return getSchemaManager().edit(ctx => {
    const newContentType = ctx.createContentType(contentType);

    componentsToCreate.forEach(ctx.createComponent);
    componentsToEdit.forEach(ctx.editComponent);

    return newContentType;
  });
};

module.exports = {
  createContentType,
};

// const path = require('path');
// const _ = require('lodash');
// const pluralize = require('pluralize');
// const fse = require('fs-extra');
// const generator = require('strapi-generate');

// const componentService = require('./Components');
// const { formatAttributes, convertAttributes } = require('../utils/attributes');
// const { nameToCollectionName } = require('../utils/helpers');

// const deleteAllRelations = ({ modelName, plugin }) => {
//   const contentTypeUpdates = Object.keys(strapi.contentTypes).map(uid => {
//     const { __schema__ } = strapi.contentTypes[uid];

//     const keysToDelete = Object.keys(__schema__.attributes).filter(key => {
//       const attr = __schema__.attributes[key];
//       const target = attr.model || attr.collection;

//       const sameModel = target === modelName;
//       const samePluginOrNoPlugin =
//         (attr.plugin && attr.plugin === plugin) || !attr.plugin;

//       if (samePluginOrNoPlugin && sameModel) {
//         return true;
//       }

//       return false;
//     });

//     if (keysToDelete.length > 0) {
//       const newchema = {
//         ...__schema__,
//         attributes: _.omit(__schema__.attributes, keysToDelete),
//       };

//       return writeContentType({ uid, schema: newchema });
//     }
//   });

//   const componentUpdates = Object.keys(strapi.components).map(uid => {
//     const { __schema__ } = strapi.components[uid];

//     const keysToDelete = Object.keys(__schema__.attributes).filter(key => {
//       const attr = __schema__.attributes[key];
//       const target = attr.model || attr.collection;

//       const sameModel = target === modelName;
//       const samePluginOrNoPlugin =
//         (attr.plugin && attr.plugin === plugin) || !attr.plugin;

//       if (samePluginOrNoPlugin && sameModel) {
//         return true;
//       }

//       return false;
//     });

//     if (keysToDelete.length > 0) {
//       const newchema = {
//         ...__schema__,
//         attributes: _.omit(__schema__.attributes, keysToDelete),
//       };

//       return componentService.editSchema({ uid, schema: newchema });
//     }
//   });

//   return Promise.all([...contentTypeUpdates, ...componentUpdates]);
// };

// const deleteBidirectionalRelations = ({ modelName, plugin }) => {
//   const updates = Object.keys(strapi.contentTypes).map(uid => {
//     const { __schema__ } = strapi.contentTypes[uid];

//     const keysToDelete = Object.keys(__schema__.attributes).filter(key => {
//       const attr = __schema__.attributes[key];
//       const target = attr.model || attr.collection;

//       const sameModel = target === modelName;
//       const samePluginOrNoPlugin =
//         (attr.plugin && attr.plugin === plugin) || !attr.plugin;

//       const isBiDirectionnal = _.has(attr, 'via');

//       if (samePluginOrNoPlugin && sameModel && isBiDirectionnal) {
//         return true;
//       }

//       return false;
//     });

//     if (keysToDelete.length > 0) {
//       const newchema = {
//         ...__schema__,
//         attributes: _.omit(__schema__.attributes, keysToDelete),
//       };

//       return writeContentType({ uid, schema: newchema });
//     }
//   });

//   return Promise.all(updates);
// };

// const buildReversedRelation = ({ key, attr, plugin, modelName }) => {
//   const targetAttributeOptions = {
//     via: key,
//     columnName: attr.targetColumnName,
//     plugin,
//   };

//   switch (attr.nature) {
//     case 'manyWay':
//     case 'oneWay':
//       return;
//     case 'oneToOne':
//     case 'oneToMany':
//       targetAttributeOptions.model = modelName;
//       break;
//     case 'manyToOne':
//       targetAttributeOptions.collection = modelName;
//       break;
//     case 'manyToMany': {
//       targetAttributeOptions.collection = modelName;

//       if (!attr.dominant) {
//         targetAttributeOptions.dominant = true;
//       }
//       break;
//     }
//     default:
//   }

//   return targetAttributeOptions;
// };

// const generateReversedRelations = ({ attributes, modelName, plugin }) => {
//   const promises = Object.keys(attributes)
//     .filter(key => _.has(attributes[key], 'target'))
//     .map(key => {
//       const attr = attributes[key];
//       const target = strapi.contentTypes[attr.target];

//       const schema = _.merge({}, target.__schema__, {
//         attributes: {
//           [attr.targetAttribute]: buildReversedRelation({
//             key,
//             attr,
//             plugin,
//             modelName,
//           }),
//         },
//       });

//       return writeContentType({ uid: attr.target, schema });
//     });

//   return Promise.all(promises);
// };

// const removeContentType = async ({ uid }) => {
//   const { apiName, __filename__ } = strapi.contentTypes[uid];

//   const baseName = path.basename(__filename__, '.settings.json');
//   const apiFolder = path.join(strapi.dir, 'api', apiName);

//   const deleteFile = async filePath => {
//     const fileName = path.basename(filePath);

//     if (_.startsWith(_.toLower(fileName), _.toLower(baseName) + '.')) {
//       await fse.remove(filePath);
//     }

//     if (fileName === 'routes.json') {
//       const { routes } = await fse.readJSON(filePath);

//       const clearedRoutes = routes.filter(route => {
//         return !_.startsWith(
//           _.toLower(route.handler),
//           _.toLower(baseName) + '.'
//         );
//       });

//       if (clearedRoutes.length === 0) {
//         await fse.remove(filePath);
//       } else {
//         await fse.writeJSON(
//           filePath,
//           {
//             routes: clearedRoutes,
//           },
//           {
//             spaces: 2,
//           }
//         );
//       }
//     }
//   };

//   const recursiveRemoveFiles = async folder => {
//     const filesName = await fse.readdir(folder);

//     for (const fileName of filesName) {
//       const filePath = path.join(folder, fileName);

//       const stat = await fse.stat(filePath);

//       if (stat.isDirectory()) {
//         await recursiveRemoveFiles(filePath);
//       } else {
//         await deleteFile(filePath);
//       }
//     }

//     const files = await fse.readdir(folder);
//     if (files.length === 0) {
//       await fse.remove(folder);
//     }
//   };

//   await recursiveRemoveFiles(apiFolder);
// };

// const writeContentType = async ({ uid, schema }) => {
//   const { plugin, apiName, __filename__ } = strapi.contentTypes[uid];

//   let fileDir;
//   if (plugin) {
//     fileDir = `./extensions/${plugin}/models`;
//   } else {
//     fileDir = `./api/${apiName}/models`;
//   }

//   const filePath = path.join(strapi.dir, fileDir, __filename__);

//   await fse.ensureFile(filePath);
//   return fse.writeFile(filePath, JSON.stringify(schema, null, 2));
// };

// const formatContentType = contentType => {
//   const { uid, plugin, connection, collectionName, info } = contentType;

//   return {
//     uid,
//     plugin,
//     schema: {
//       name: _.get(info, 'name') || _.upperFirst(pluralize(uid)),
//       description: _.get(info, 'description', ''),
//       connection,
//       collectionName,
//       attributes: formatAttributes(contentType),
//     },
//   };
// };

// const createContentTypeSchema = infos => ({
//   connection:
//     infos.connection ||
//     _.get(
//       strapi,
//       ['config', 'currentEnvironment', 'database', 'defaultConnection'],
//       'default'
//     ),
//   collectionName:
//     infos.collectionName || `${nameToCollectionName(pluralize(infos.name))}`,
//   info: {
//     name: infos.name,
//     description: infos.description,
//   },
//   attributes: convertAttributes(infos.attributes),
// });

// const updateContentTypeSchema = (old, infos) => ({
//   ...old,
//   connection: infos.connection || old.connection,
//   collectionName: infos.collectionName || old.collectionName,
//   info: {
//     name: infos.name || old.info.name,
//     description: infos.description || old.info.description,
//   },
//   // TODO: keep old params like autoMigration, private, configurable
//   attributes: convertAttributes(infos.attributes),
// });

// const generateAPI = (name, contentType) => {
//   // create api
//   return new Promise((resolve, reject) => {
//     const scope = {
//       generatorType: 'api',
//       id: name,
//       name,
//       rootPath: strapi.dir,
//       args: {
//         displayName: contentType.info.name,
//         description: contentType.info.description,
//         connection: contentType.connection,
//         collectionName: contentType.collectionName,
//         attributes: contentType.attributes,
//       },
//     };

//     generator(scope, {
//       success: () => resolve(),
//       error: err => reject(err),
//     });
//   });
// };

// module.exports = {
// generateAPI,
// createContentTypeSchema,
// updateContentTypeSchema,

// deleteAllRelations,
// deleteBidirectionalRelations,
// generateReversedRelations,

// formatContentType,
// writeContentType,
// removeContentType,
// };

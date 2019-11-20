'use strict';

const path = require('path');
const createSchemaBuilder = require('./schema-builder');

/**
 * Singleton schemaManager
 */
let schemaManager;
module.exports = function getManager() {
  if (schemaManager === undefined) return createSchemaManager();
  return schemaManager;
};

function createSchemaManager() {
  const components = Object.keys(strapi.components).map(key => {
    const compo = strapi.components[key];

    return {
      modelName: compo.modelName,
      plugin: compo.modelName,
      uid: compo.uid,
      filename: compo.__filename__,
      dir: path.join(strapi.dir, 'components', compo.category),
      schema: compo.__schema__,
    };
  });

  const contentTypes = Object.keys(strapi.contentTypes).map(key => {
    const contentType = strapi.contentTypes[key];

    let dir;
    if (contentType.plugin) {
      dir = `./extensions/${contentType.plugin}/models`;
    } else {
      dir = `./api/${contentType.apiName}/models`;
    }

    return {
      modelName: contentType.modelName,
      plugin: contentType.plugin,
      uid: contentType.uid,
      filename: contentType.__filename__,
      dir: path.join(strapi.dir, dir),
      schema: contentType.__schema__,
    };
  });

  return {
    async edit(editorFn) {
      const builder = createSchemaBuilder({
        components,
        contentTypes,
      });

      const result = await Promise.resolve()
        .then(() => editorFn(builder))
        .catch(error => {
          strapi.log.error(error);
          throw error;
        });

      await builder
        .flush()
        .catch(error => {
          strapi.log.error('Error writing schema files');
          strapi.log.error(error);
          return builder.rollback();
        })
        .catch(error => {
          strapi.log.error(
            'Error rolling back schema files. You might need to fix your files manually'
          );
          strapi.log.error(error);

          throw new Error('Invalid schema edition');
        });

      return result;
    },
  };
}

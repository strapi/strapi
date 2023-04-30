'use strict';

const { join } = require('path');
const _ = require('lodash');
const { pathExists } = require('fs-extra');
const loadFiles = require('../../load/load-files');

module.exports = async (strapi) => {
  if (!(await pathExists(strapi.dirs.dist.components))) {
    return {};
  }

  const map = await loadFiles(strapi.dirs.dist.components, '*/*.*(js|json)');

  Object.entries(map).forEach(([category, schemas]) => {
    const entries = Object.entries(schemas).map(([key, schema]) => {
      if (!schema.collectionName) {
        // NOTE: We're using the filepath from the app directory instead of the dist for information purpose
        const filePath = join(strapi.dirs.app.components, category, schema.__filename__);

        return strapi.stopWithError(
          `Component ${key} is missing a "collectionName" property.\nVerify file ${filePath}.`
        );
      }

      const uid = `${category}.${key}`;

      // TODO: Most of this should go into core/strapi/lib/core/domain/component/index.js
      const definition = {
        schema: Object.assign(schema, {
          __schema__: _.cloneDeep(schema),
          uid,
          category,
          modelType: 'component',
          modelName: key,
          globalId: schema.globalId || _.upperFirst(_.camelCase(`component_${uid}`)),
          info: Object.assign(schema.info, {
            singularName: key,
          }),
        }),
      };

      return [key, definition];
    }, {});

    const components = Object.fromEntries(entries);
    strapi.container.get('components').add(category, components);
  });
};

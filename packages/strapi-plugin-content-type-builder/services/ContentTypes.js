'use strict';

const _ = require('lodash');
const path = require('path');
const fse = require('fs-extra');
const pluralize = require('pluralize');
const generator = require('strapi-generate');

const { formatAttributes } = require('../utils/attributes');
const getSchemaManager = require('./schema-manager');
const { nameToSlug } = require('../utils/helpers');

/**
 * Creates a component and handle the nested components sent with it
 * @param {Object} params params object
 * @param {Object} params.component Main component to create
 * @param {Array<Object>} params.components List of nested components to created or edit
 */
const createContentType = async ({ contentType, components = [] }) => {
  const componentsToCreate = components.filter(compo => !_.has(compo, 'uid'));
  const componentsToEdit = components.filter(compo => _.has(compo, 'uid'));

  return getSchemaManager().edit(async ctx => {
    const newContentType = ctx.createContentType(contentType);

    componentsToCreate.forEach(component => ctx.createComponent(component));
    componentsToEdit.forEach(component => ctx.editComponent(component));

    // generate api squeleton
    await generateAPI(contentType.name);

    return newContentType;
  });
};

/**
 * Generate a squeleton API
 * @param {*} name
 * @param {*} contentType
 */
const generateAPI = name => {
  return new Promise((resolve, reject) => {
    const scope = {
      generatorType: 'api',
      id: nameToSlug(name),
      name: nameToSlug(name),
      rootPath: strapi.dir,
      args: {
        attributes: {},
      },
    };

    generator(scope, {
      success: () => resolve(),
      error: err => reject(err),
    });
  });
};

/**
 * Edits a contentType and handle the nested contentTypes sent with it
 * @param {Object} params params object
 * @param {Object} params.contentType Main contentType to create
 * @param {Array<Object>} params.components List of nested components to created or edit
 */
const editContentType = (uid, { contentType, components = [] }) => {
  const componentsToCreate = components.filter(compo => !_.has(compo, 'uid'));
  const componentsToEdit = components.filter(compo => _.has(compo, 'uid'));

  return getSchemaManager().edit(ctx => {
    const updatedComponent = ctx.editContentType({
      uid,
      ...contentType,
    });

    componentsToCreate.forEach(component => ctx.createComponent(component));
    componentsToEdit.forEach(component => ctx.editComponent(component));

    return updatedComponent;
  });
};

const deleteContentType = async uid => {
  const compo = await getSchemaManager().edit(ctx =>
    ctx.deleteContentType(uid)
  );

  try {
    await clearApiFolder(uid);
    return compo;
  } catch (err) {
    throw new Error(`Error clearing the api folder ${err.message}`);
  }
};

const clearApiFolder = async uid => {
  const { apiName, __filename__ } = strapi.contentTypes[uid];

  const baseName = path.basename(__filename__, '.settings.json');
  const apiFolder = path.join(strapi.dir, 'api', apiName);

  const deleteFile = async filePath => {
    const fileName = path.basename(filePath);

    if (_.startsWith(_.toLower(fileName), _.toLower(baseName) + '.')) {
      await fse.remove(filePath);
    }

    if (fileName === 'routes.json') {
      const { routes } = await fse.readJSON(filePath);

      const clearedRoutes = routes.filter(route => {
        return !_.startsWith(
          _.toLower(route.handler),
          _.toLower(baseName) + '.'
        );
      });

      if (clearedRoutes.length === 0) {
        await fse.remove(filePath);
      } else {
        await fse.writeJSON(
          filePath,
          {
            routes: clearedRoutes,
          },
          {
            spaces: 2,
          }
        );
      }
    }
  };

  const recursiveRemoveFiles = async folder => {
    const filesName = await fse.readdir(folder);

    for (const fileName of filesName) {
      const filePath = path.join(folder, fileName);

      const stat = await fse.stat(filePath);

      if (stat.isDirectory()) {
        await recursiveRemoveFiles(filePath);
      } else {
        await deleteFile(filePath);
      }
    }

    const files = await fse.readdir(folder);
    if (files.length === 0) {
      await fse.remove(folder);
    }
  };

  await recursiveRemoveFiles(apiFolder);
};

const formatContentType = contentType => {
  const { uid, plugin, connection, collectionName, info } = contentType;

  return {
    uid,
    plugin,
    schema: {
      name: _.get(info, 'name') || _.upperFirst(pluralize(uid)),
      description: _.get(info, 'description', ''),
      connection,
      collectionName,
      attributes: formatAttributes(contentType),
    },
  };
};

module.exports = {
  createContentType,
  editContentType,
  deleteContentType,

  formatContentType,
};

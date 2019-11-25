'use strict';

const _ = require('lodash');
const pluralize = require('pluralize');
const generator = require('strapi-generate');

const getSchemaManager = require('./schema-manager');
const apiCleaner = require('./clear-api');
const { formatAttributes } = require('../utils/attributes');
const { nameToSlug } = require('../utils/helpers');

/**
 * Format a contentType info to be used by the front-end
 * @param {Object} contentType
 */
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
 * Generate an API squeleton
 * @param {string} name
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

/**
 * Deletes a content type and the api files related to it
 * @param {string} uid content type uid
 */
const deleteContentType = async uid => {
  // make a backup
  await apiCleaner.backup(uid);

  return getSchemaManager().edit(async ctx => {
    const component = ctx.deleteContentType(uid);

    try {
      await ctx.flush();
      await apiCleaner.clear(uid);
    } catch (error) {
      await ctx.rollback();
      await apiCleaner.rollback(uid);

      throw new Error(
        `Error delete ContentType: ${error.message}. Changes were rollbacked`
      );
    }

    return component;
  });
};

module.exports = {
  createContentType,
  editContentType,
  deleteContentType,

  formatContentType,
};

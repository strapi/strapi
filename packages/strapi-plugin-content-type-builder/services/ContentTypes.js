'use strict';

const _ = require('lodash');
const pluralize = require('pluralize');
const generator = require('strapi-generate');

const createBuilder = require('./schema-builder');
const apiCleaner = require('./clear-api');
const {
  formatAttributes,
  replaceTemporaryUIDs,
} = require('../utils/attributes');
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
  const builder = createBuilder();

  const uidMap = builder.createNewComponentUIDMap(components);

  const replaceTmpUIDs = replaceTemporaryUIDs(uidMap);

  const newContentType = builder.createContentType(replaceTmpUIDs(contentType));

  components.forEach(component => {
    if (!_.has(component, 'uid')) {
      return builder.createComponent(replaceTmpUIDs(component));
    }

    return builder.editComponent(replaceTmpUIDs(component));
  });

  // generate api squeleton
  await generateAPI(contentType.name);

  await builder.writeFiles();
  return newContentType;
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
const editContentType = async (uid, { contentType, components = [] }) => {
  const builder = createBuilder();

  const uidMap = builder.createNewComponentUIDMap(components);
  const replaceTmpUIDs = replaceTemporaryUIDs(uidMap);

  const updatedComponent = builder.editContentType({
    uid,
    ...replaceTmpUIDs(contentType),
  });

  components.forEach(component => {
    if (!_.has(component, 'uid')) {
      return builder.createComponent(replaceTmpUIDs(component));
    }

    return builder.editComponent(replaceTmpUIDs(component));
  });

  await builder.writeFiles();
  return updatedComponent;
};

/**
 * Deletes a content type and the api files related to it
 * @param {string} uid content type uid
 */
const deleteContentType = async uid => {
  const builder = createBuilder();

  // make a backup
  await apiCleaner.backup(uid);

  const component = builder.deleteContentType(uid);

  try {
    await builder.writeFiles();
    await apiCleaner.clear(uid);
  } catch (error) {
    await apiCleaner.rollback(uid);
  }

  return component;
};

module.exports = {
  createContentType,
  editContentType,
  deleteContentType,

  formatContentType,
};

'use strict';

const _ = require('lodash');
const pluralize = require('pluralize');
const generator = require('strapi-generate');

const createBuilder = require('./schema-builder');
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

const applyComponentUIDMap = map => ct => {
  return {
    ...ct,
    attributes: Object.keys(ct.attributes).reduce((acc, key) => {
      const attr = ct.attributes[key];
      if (attr.type === 'component' && _.has(map, attr.component)) {
        acc[key] = {
          ...attr,
          component: map[attr.component],
        };
      } else {
        acc[key] = attr;
      }

      return acc;
    }, {}),
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

  const builder = createBuilder();

  const uidMap = componentsToCreate.reduce((uidMap, component) => {
    uidMap[component.tmpUID] = builder.createComponentUID(component);
    return uidMap;
  }, {});

  const updateAttributes = applyComponentUIDMap(uidMap);

  const newContentType = builder.createContentType(
    updateAttributes(contentType)
  );

  componentsToCreate.forEach(component =>
    builder.createComponent(updateAttributes(component))
  );

  componentsToEdit.forEach(component =>
    builder.editComponent(updateAttributes(component))
  );

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
  const componentsToCreate = components.filter(compo => !_.has(compo, 'uid'));
  const componentsToEdit = components.filter(compo => _.has(compo, 'uid'));

  const builder = createBuilder();
  const updatedComponent = builder.editContentType({
    uid,
    ...contentType,
  });

  componentsToCreate.forEach(component => builder.createComponent(component));
  componentsToEdit.forEach(component => builder.editComponent(component));

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

'use strict';

const _ = require('lodash');
const pluralize = require('pluralize');
const generator = require('strapi-generate');

const { nameToSlug, contentTypes: contentTypesUtils } = require('strapi-utils');
const { formatAttributes, replaceTemporaryUIDs } = require('../utils/attributes');
const createBuilder = require('./schema-builder');
const apiHandler = require('./api-handler');
const { coreUids, pluginsUids } = require('./constants');

const isContentTypeEditable = (contentType = {}) => {
  const { uid } = contentType;
  return !uid.startsWith(coreUids.PREFIX) && uid !== pluginsUids.UPLOAD_FILE;
};

const getRestrictRelationsTo = (contentType = {}) => {
  const { uid } = contentType;
  if (uid === coreUids.STRAPI_USER) {
    return ['oneWay', 'manyWay'];
  }

  if (uid.startsWith(coreUids.PREFIX) || uid === pluginsUids.UPLOAD_FILE) {
    return [];
  }

  return null;
};

const getformattedName = (contentType = {}) => {
  const { uid, info } = contentType;
  const name = _.get(info, 'name') || _.upperFirst(pluralize(uid));

  return name;
};

/**
 * Format a contentType info to be used by the front-end
 * @param {Object} contentType
 */
const formatContentType = contentType => {
  const { uid, kind, modelName, plugin, connection, collectionName, info, options } = contentType;

  return {
    uid,
    plugin,
    apiID: modelName,
    schema: {
      name: getformattedName(contentType),
      description: _.get(info, 'description', ''),
      draftAndPublish: contentTypesUtils.hasDraftAndPublish({ options }),
      connection,
      kind: kind || 'collectionType',
      collectionName,
      attributes: formatAttributes(contentType),
      editable: isContentTypeEditable(contentType),
      restrictRelationsTo: getRestrictRelationsTo(contentType),
    },
  };
};

/**
 * Creates a content type and handle the nested components sent with it
 * @param {Object} params params object
 * @param {Object} params.contentType Main component to create
 * @param {Array<Object>} params.components List of nested components to created or edit
 */
const createContentType = async ({ contentType, components = [] }) => {
  const builder = createBuilder();

  const uidMap = builder.createNewComponentUIDMap(components);

  const replaceTmpUIDs = replaceTemporaryUIDs(uidMap);

  const newContentType = builder.createContentType(replaceTmpUIDs(contentType));

  // allow components to target the new contentType
  const targetContentType = infos => {
    Object.keys(infos.attributes).forEach(key => {
      const { target } = infos.attributes[key];
      if (target === '__contentType__') {
        infos.attributes[key].target = newContentType.uid;
      }
    });

    return infos;
  };

  components.forEach(component => {
    const options = replaceTmpUIDs(targetContentType(component));

    if (!_.has(component, 'uid')) {
      return builder.createComponent(options);
    }

    return builder.editComponent(options);
  });

  // generate api squeleton
  await generateAPI({
    name: contentType.name,
    kind: contentType.kind,
  });

  await builder.writeFiles();
  return newContentType;
};

/**
 * Generate an API squeleton
 * @param {string} name
 */
const generateAPI = ({ name, kind = 'collectionType' }) => {
  return new Promise((resolve, reject) => {
    const scope = {
      generatorType: 'api',
      id: nameToSlug(name),
      name: nameToSlug(name),
      rootPath: strapi.dir,
      args: {
        attributes: {},
        kind,
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

  const previousKind = builder.contentTypes.get(uid).schema.kind;
  const newKind = contentType.kind || previousKind;

  if (newKind !== previousKind && newKind === 'singleType') {
    const entryCount = await strapi.query(uid).count();
    if (entryCount > 1) {
      throw strapi.errors.badRequest(
        'You cannot convert a collectionType to a singleType when having multiple entries in DB'
      );
    }
  }

  const uidMap = builder.createNewComponentUIDMap(components);
  const replaceTmpUIDs = replaceTemporaryUIDs(uidMap);

  const updatedContentType = builder.editContentType({
    uid,
    ...replaceTmpUIDs(contentType),
  });

  components.forEach(component => {
    if (!_.has(component, 'uid')) {
      return builder.createComponent(replaceTmpUIDs(component));
    }

    return builder.editComponent(replaceTmpUIDs(component));
  });

  if (newKind !== previousKind) {
    await apiHandler.backup(uid);

    try {
      await apiHandler.clear(uid);

      // generate new api skeleton
      await generateAPI({
        name: updatedContentType.schema.info.name,
        kind: updatedContentType.schema.kind,
      });

      await builder.writeFiles();
    } catch (error) {
      strapi.log.error(error);
      await apiHandler.rollback(uid);
    }

    return updatedContentType;
  }

  await builder.writeFiles();
  return updatedContentType;
};

/**
 * Deletes a content type and the api files related to it
 * @param {string} uid content type uid
 */
const deleteContentType = async uid => {
  const builder = createBuilder();

  // make a backup
  await apiHandler.backup(uid);

  const component = builder.deleteContentType(uid);

  try {
    await builder.writeFiles();
    await apiHandler.clear(uid);
  } catch (error) {
    await apiHandler.rollback(uid);
  }

  return component;
};

module.exports = {
  createContentType,
  editContentType,
  deleteContentType,
  formatContentType,
};

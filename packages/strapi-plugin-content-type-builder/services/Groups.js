'use strict';

const _ = require('lodash');
const pluralize = require('pluralize');
const slugify = require('@sindresorhus/slugify');

/**
 * Returns a list of all available groups with formatted attributes
 */
const getGroups = () => {
  return Object.keys(strapi.groups).map(uid => {
    return formatGroup(uid, strapi.groups[uid]);
  });
};

/**
 * Returns a group by uid
 * @param {string} uid - group's UID
 */
const getGroup = uid => {
  const group = strapi.groups[uid];
  if (!group) return null;

  return formatGroup(uid, group);
};

/**
 * Formats a group attributes
 * @param {string} uid - string
 * @param {Object} group - strapi group model
 */
const formatGroup = (uid, group) => {
  const { connection, collectionName, attributes, info } = group;

  return {
    uid,
    schema: {
      name: _.get(info, 'name') || _.upperFirst(pluralize(uid)),
      description: _.get(info, 'description', ''),
      connection,
      collectionName,
      attributes: formatAttributes(attributes, { group }),
    },
  };
};

/**
 * Formats a group's attributes
 * @param {Object} attributes - the attributes map
 * @param {Object} context - function context
 * @param {Object} context.group - the associated group
 */
const formatAttributes = (attributes, { group }) => {
  return Object.keys(attributes).reduce((acc, key) => {
    acc[key] = formatAttribute(key, attributes[key], { group });
    return acc;
  }, {});
};

/**
 * Fromats a group attribute
 * @param {string} key - the attribute key
 * @param {Object} attribute - the attribute
 * @param {Object} context - function context
 * @param {Object} context.group - the associated group
 */
const formatAttribute = (key, attribute, { group }) => {
  if (_.has(attribute, 'type')) return attribute;

  // format relations
  const relation = (group.associations || []).find(
    assoc => assoc.alias === key
  );
  const { plugin } = attribute;
  let targetEntity = attribute.model || attribute.collection;

  if (plugin === 'upload' && targetEntity === 'file') {
    return {
      type: 'media',
      multiple: attribute.collection ? true : false,
      required: attribute.required ? true : false,
    };
  } else {
    return {
      nature: relation.nature,
      target: targetEntity,
      plugin: plugin || undefined,
      dominant: attribute.dominant ? true : false,
      key: attribute.via || undefined,
      columnName: attribute.columnName || undefined,
      targetColumnName: _.get(
        strapi.getModel(targetEntity, plugin),
        ['attributes', attribute.via, 'columnName'],
        undefined
      ),
      unique: attribute.unique ? true : false,
    };
  }
};

/**
 * Creates a group schema file
 * @param {string} uid
 * @param {Object} infos
 */
async function createGroup(uid, infos) {
  const schema = createSchema(uid, infos);

  await writeSchema(uid, schema);
  return { uid };
}

/**
 * Updates a group schema file
 * @param {Object} group
 * @param {Object} infos
 */
async function updateGroup(group, infos) {
  const { uid } = group;

  const newUid = createGroupUID(infos.name);
  if (uid !== newUid) {
    await deleteSchema(uid);
    return createGroup(newUid, infos);
  }

  const updatedSchema = { ...group.schema, ...createSchema(uid, infos) };

  await writeSchema(uid, updatedSchema);
  return { uid };
}

/**
 * Create a schema
 * @param {Object} infos
 */
const createSchema = (uid, infos) => {
  const {
    name,
    connection = 'default',
    description = '',
    collectionName,
    attributes,
  } = infos;

  return {
    info: {
      name,
      description,
    },
    connection,
    collectionName: collectionName || `groups_${pluralize(uid)}`,
    attributes: convertAttributes(attributes),
  };
};

const convertAttributes = attributes => {
  return Object.keys(attributes).reduce((acc, key) => {
    const attribute = attributes[key];

    if (_.has(attribute, 'type')) {
      if (attribute.type === 'media') {
        const fileModel = strapi.getModel('file', 'upload');
        if (!fileModel) return acc;

        const via = _.findKey(fileModel.attributes, { collection: '*' });
        acc[key] = {
          [attribute.multiple ? 'collection' : 'model']: 'file',
          via,
          plugin: 'upload',
          required: attribute.required ? true : false,
        };
      } else {
        acc[key] = attribute;
      }

      return acc;
    }

    if (_.has(attribute, 'target')) {
      const { target, nature, required, unique, plugin } = attribute;

      // ingore relation which aren't oneWay or manyWay (except for images)
      if (!['oneWay', 'manyWay'].includes(nature)) {
        return acc;
      }

      acc[key] = {
        [nature === 'oneWay' ? 'model' : 'collection']: target,
        plugin: plugin ? _.trim(plugin) : undefined,
        required: required === true ? true : undefined,
        unique: unique === true ? true : undefined,
      };
    }

    return acc;
  }, {});
};

/**
 * Returns a uid from a string
 * @param {string} str - string to slugify
 */
const createGroupUID = str => slugify(str, { separator: '_' });

/**
 * Deletes a group
 * @param {Object} group
 */
async function deleteGroup(group) {
  await deleteSchema(group.uid);
}

/**
 * Writes a group schema file
 */
async function writeSchema(uid, schema) {
  await strapi.fs.writeAppFile(
    `groups/${uid}.json`,
    JSON.stringify(schema, null, 2)
  );
}

/**
 * Deletes a group schema file
 * @param {string} ui
 */
async function deleteSchema(uid) {
  await strapi.fs.removeAppFile(`groups/${uid}.json`);
}

const updateGroupInModels = (oldUID, newUID) => {
  const contentTypeService =
    strapi.plugins['content-type-builder'].services.contenttypebuilder;

  const updateModels = (models, { plugin } = {}) => {
    Object.keys(models).forEach(modelKey => {
      const model = models[modelKey];

      const attributesToModify = Object.keys(model.attributes).reduce(
        (acc, key) => {
          if (
            model.attributes[key].type === 'group' &&
            model.attributes[key].group === oldUID
          ) {
            acc.push(key);
          }

          return acc;
        },
        []
      );

      if (attributesToModify.length > 0) {
        const modelJSON = contentTypeService.readModel(modelKey, {
          plugin,
          api: model.apiName,
        });

        attributesToModify.forEach(key => {
          modelJSON.attributes[key].group = newUID;
        });

        contentTypeService.writeModel(modelKey, modelJSON, {
          plugin,
          api: model.apiName,
        });
      }
    });
  };

  updateModels(strapi.models);

  Object.keys(strapi.plugins).forEach(pluginKey => {
    updateModels(strapi.plugins[pluginKey].models, { plugin: pluginKey });
  });

  // add strapi.groups or strapi.admin if necessary
};

const deleteGroupInModels = groupUID => {
  const contentTypeService =
    strapi.plugins['content-type-builder'].services.contenttypebuilder;

  const updateModels = (models, { plugin } = {}) => {
    Object.keys(models).forEach(modelKey => {
      const model = models[modelKey];

      const attributesToDelete = Object.keys(model.attributes).reduce(
        (acc, key) => {
          if (
            model.attributes[key].type === 'group' &&
            model.attributes[key].group === groupUID
          ) {
            acc.push(key);
          }

          return acc;
        },
        []
      );

      if (attributesToDelete.length > 0) {
        const modelJSON = contentTypeService.readModel(modelKey, {
          plugin,
          api: model.apiName,
        });

        attributesToDelete.forEach(key => {
          delete modelJSON.attributes[key];
        });

        contentTypeService.writeModel(modelKey, modelJSON, {
          plugin,
          api: model.apiName,
        });
      }
    });
  };

  updateModels(strapi.models);

  Object.keys(strapi.plugins).forEach(pluginKey => {
    updateModels(strapi.plugins[pluginKey].models, { plugin: pluginKey });
  });

  // add strapi.groups or strapi.admin if necessary
};

module.exports = {
  getGroups,
  getGroup,
  createGroup,
  createGroupUID,
  updateGroup,
  deleteGroup,

  // export for testing only
  createSchema,

  deleteGroupInModels,
  updateGroupInModels,
};

'use strict';

const path = require('path');
const _ = require('lodash');
const fse = require('fs-extra');
const pluralize = require('pluralize');
const slugify = require('@sindresorhus/slugify');

/**
 * Returns a list of all available components with formatted attributes
 */
const getComponents = () => {
  return Object.keys(strapi.components).map(uid => {
    return formatComponent(uid, strapi.components[uid]);
  });
};

/**
 * Returns a component by uid
 * @param {string} uid - component's UID
 */
const getComponent = uid => {
  const component = strapi.components[uid];
  if (!component) return null;

  return formatComponent(uid, component);
};

/**
 * Formats a component attributes
 * @param {string} uid - string
 * @param {Object} component - strapi component model
 */
const formatComponent = (uid, component) => {
  const { connection, collectionName, attributes, info, category } = component;

  return {
    uid,
    category,
    schema: {
      icon: _.get(info, 'icon'),
      name: _.get(info, 'name') || _.upperFirst(pluralize(uid)),
      description: _.get(info, 'description', ''),
      connection,
      collectionName,
      attributes: formatAttributes(attributes, { component }),
    },
  };
};

/**
 * Formats a component's attributes
 * @param {Object} attributes - the attributes map
 * @param {Object} context - function context
 * @param {Object} context.component - the associated component
 */
const formatAttributes = (attributes, { component }) => {
  return Object.keys(attributes).reduce((acc, key) => {
    acc[key] = formatAttribute(key, attributes[key], { component });
    return acc;
  }, {});
};

/**
 * Fromats a component attribute
 * @param {string} key - the attribute key
 * @param {Object} attribute - the attribute
 * @param {Object} context - function context
 * @param {Object} context.component - the associated component
 */
const formatAttribute = (key, attribute, { component }) => {
  if (_.has(attribute, 'type')) return attribute;

  // format relations
  const relation = (component.associations || []).find(
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
 * Creates a component schema file
 * @param {string} uid
 * @param {Object} infos
 */
async function createComponent(uid, infos) {
  const { name, category } = infos;
  const schema = createSchema(uid, infos);

  await writeSchema({ name, schema, category });
  return { uid };
}

/**
 * Updates a component schema file
 * @param {Object} component
 * @param {Object} infos
 */
async function updateComponent(component, infos) {
  const { uid, schema: oldSchema } = component;

  // don't update collectionName if not provided
  const updatedSchema = {
    info: {
      name: infos.name || oldSchema.name,
      description: infos.description || oldSchema.description,
    },
    connection: infos.connection || oldSchema.connection,
    collectionName: infos.collectionName || oldSchema.collectionName,
    attributes: convertAttributes(infos.attributes),
  };

  const newUID = createComponentUID(infos.name);
  if (uid !== newUID) {
    await deleteSchema(uid);

    if (_.has(strapi.plugins, ['content-manager', 'services', 'components'])) {
      await _.get(strapi.plugins, [
        'content-manager',
        'services',
        'components',
      ]).updateUID(uid, newUID);
    }

    await writeSchema(newUID, updatedSchema);
    return { uid: newUID };
  }

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
    icon,
    category,
    connection = _.get(
      strapi,
      ['config', 'currentEnvironment', 'database', 'defaultConnection'],
      'default'
    ),
    description = '',
    collectionName,
    attributes,
  } = infos;

  return {
    info: {
      name,
      description,
      icon,
    },
    connection,
    collectionName:
      collectionName || `components_${category}_${nameToSlug(pluralize(name))}`,
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
      const { target, nature, unique, plugin } = attribute;

      // ingore relation which aren't oneWay or manyWay
      if (!['oneWay', 'manyWay'].includes(nature)) {
        return acc;
      }

      acc[key] = {
        [nature === 'oneWay' ? 'model' : 'collection']: target,
        plugin: plugin ? _.trim(plugin) : undefined,
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
const createComponentUID = ({ category, name }) =>
  `${category}.${nameToSlug(name)}`;

/**
 * Converts a name to a slug
 * @param {string} name a name to convert
 */
const nameToSlug = name => slugify(name, { separator: '_' });

/**
 * Deletes a component
 * @param {Object} component
 */
async function deleteComponent(component) {
  await deleteSchema(component.uid);
}

/**
 * Writes a component schema file
 */
async function writeSchema({ name, schema, category }) {
  const categoryDir = path.join(strapi.dir, 'components', category);

  if (!(await fse.pathExists(categoryDir))) {
    await fse.mkdir(categoryDir);
  }

  const filename = nameToSlug(name);
  const filepath = path.join(categoryDir, `${filename}.json`);

  await fse.writeFile(filepath, JSON.stringify(schema, null, 2));
}

/**
 * Deletes a component schema file
 * @param {string} ui
 */
async function deleteSchema(uid) {
  await strapi.fs.removeAppFile(`components/${uid}.json`);
}

const updateComponentInModels = (oldUID, newUID) => {
  const contentTypeService =
    strapi.plugins['content-type-builder'].services.contenttypebuilder;

  const updateModels = (models, { plugin } = {}) => {
    Object.keys(models).forEach(modelKey => {
      const model = models[modelKey];

      const attributesToModify = Object.keys(model.attributes).reduce(
        (acc, key) => {
          if (
            model.attributes[key].type === 'component' &&
            model.attributes[key].component === oldUID
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
          modelJSON.attributes[key].component = newUID;
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

  // add strapi.components or strapi.admin if necessary
};

const deleteComponentInModels = componentUID => {
  const contentTypeService =
    strapi.plugins['content-type-builder'].services.contenttypebuilder;

  const updateModels = (models, { plugin } = {}) => {
    Object.keys(models).forEach(modelKey => {
      const model = models[modelKey];

      const attributesToDelete = Object.keys(model.attributes).reduce(
        (acc, key) => {
          if (
            model.attributes[key].type === 'component' &&
            model.attributes[key].component === componentUID
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

  // add strapi.components or strapi.admin if necessary
};

module.exports = {
  getComponents,
  getComponent,
  createComponent,
  createComponentUID,
  updateComponent,
  deleteComponent,

  // export for testing only
  createSchema,

  deleteComponentInModels,
  updateComponentInModels,
};

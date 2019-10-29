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
async function createComponent({ uid, infos }) {
  const schema = createSchema(infos);

  await writeSchema({ uid, schema });
  return { uid };
}

/**
 * Updates a component schema file
 * @param {Object} component
 * @param {Object} infos
 */
async function updateComponent({ component, newUID, infos }) {
  const { uid, schema: oldSchema } = component;

  // don't update collectionName if not provided
  const updatedSchema = {
    info: {
      icon: infos.icon,
      name: infos.name,
      description: infos.description || oldSchema.description,
    },
    connection: infos.connection || oldSchema.connection,
    collectionName: infos.collectionName || oldSchema.collectionName,
    attributes: convertAttributes(infos.attributes),
  };

  if (uid !== newUID) {
    await deleteSchema(uid);

    if (_.has(strapi.plugins, ['content-manager', 'services', 'components'])) {
      await _.get(strapi.plugins, [
        'content-manager',
        'services',
        'components',
      ]).updateUID(uid, newUID);
    }

    await writeSchema({
      uid: newUID,
      schema: updatedSchema,
    });

    const [category] = uid.split('.');

    const categoryDir = path.join(strapi.dir, 'components', category);
    const categoryCompos = await fse.readdir(categoryDir);
    if (categoryCompos.length === 0) {
      await fse.rmdir(categoryDir);
    }

    return { uid: newUID };
  }

  await writeSchema({ uid, schema: updatedSchema });
  return { uid };
}

/**
 * Create a schema
 * @param {Object} infos
 */
const createSchema = infos => {
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
async function writeSchema({ uid, schema }) {
  const [category, filename] = uid.split('.');
  const categoryDir = path.join(strapi.dir, 'components', category);

  if (!(await fse.pathExists(categoryDir))) {
    await fse.ensureDir(categoryDir);
  }

  const filepath = path.join(categoryDir, `${filename}.json`);
  await fse.writeFile(filepath, JSON.stringify(schema, null, 2));
}

/**
 * Deletes a component schema file
 * @param {string} ui
 */
async function deleteSchema(uid) {
  const [category, filename] = uid.split('.');
  await strapi.fs.removeAppFile(`components/${category}/${filename}.json`);
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

      const dynamicoznesToUpdate = Object.keys(model.attributes).filter(key => {
        return (
          model.attributes[key].type === 'dynamiczone' &&
          model.attributes[key].components.includes(oldUID)
        );
      }, []);

      if (attributesToModify.length > 0) {
        const modelJSON = contentTypeService.readModel(modelKey, {
          plugin,
          api: model.apiName,
        });

        attributesToModify.forEach(key => {
          modelJSON.attributes[key].component = newUID;
        });

        dynamicoznesToUpdate.forEach(key => {
          modelJSON.attributes[key] = {
            ...modelJSON.attributes[key],
            components: modelJSON.attributes[key].components.map(val =>
              val !== oldUID ? val : newUID
            ),
          };
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

  Object.keys(strapi.components).forEach(uid => {
    const component = strapi.components[uid];

    const componentsToRemove = Object.keys(component.attributes).filter(key => {
      return (
        component.attributes[key].type === 'component' &&
        component.attributes[key].component === oldUID
      );
    }, []);

    if (componentsToRemove.length > 0) {
      const newSchema = {
        info: component.info,
        connection: component.connection,
        collectionName: component.collectionName,
        attributes: component.attributes,
      };

      componentsToRemove.forEach(key => {
        newSchema.attributes[key].component = newUID;
      });

      writeSchema({ uid, schema: newSchema });
    }
  });
};

const deleteComponentInModels = async componentUID => {
  const [category] = componentUID.split('.');
  const contentTypeService =
    strapi.plugins['content-type-builder'].services.contenttypebuilder;

  const updateModels = (models, { plugin } = {}) => {
    Object.keys(models).forEach(modelKey => {
      const model = models[modelKey];

      const componentsToRemove = Object.keys(model.attributes).filter(key => {
        return (
          model.attributes[key].type === 'component' &&
          model.attributes[key].component === componentUID
        );
      }, []);

      const dynamicoznesToUpdate = Object.keys(model.attributes).filter(key => {
        return (
          model.attributes[key].type === 'dynamiczone' &&
          model.attributes[key].components.includes(componentUID)
        );
      }, []);

      if (componentsToRemove.length > 0 || dynamicoznesToUpdate.length > 0) {
        const modelJSON = contentTypeService.readModel(modelKey, {
          plugin,
          api: model.apiName,
        });

        componentsToRemove.forEach(key => {
          delete modelJSON.attributes[key];
        });

        dynamicoznesToUpdate.forEach(key => {
          modelJSON.attributes[key] = {
            ...modelJSON.attributes[key],
            components: modelJSON.attributes[key].components.filter(
              val => val !== componentUID
            ),
          };
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

  Object.keys(strapi.components).forEach(uid => {
    const component = strapi.components[uid];

    const componentsToRemove = Object.keys(component.attributes).filter(key => {
      return (
        component.attributes[key].type === 'component' &&
        component.attributes[key].component === componentUID
      );
    }, []);

    if (componentsToRemove.length > 0) {
      const newSchema = {
        info: component.info,
        connection: component.connection,
        collectionName: component.collectionName,
        attributes: component.attributes,
      };

      componentsToRemove.forEach(key => {
        delete newSchema.attributes[key];
      });

      writeSchema({ uid, schema: newSchema });
    }
  });

  const categoryDir = path.join(strapi.dir, 'components', category);
  const categoryCompos = await fse.readdir(categoryDir);
  if (categoryCompos.length === 0) {
    await fse.rmdir(categoryDir);
  }
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

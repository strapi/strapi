'use strict';

const path = require('path');
const _ = require('lodash');
const fse = require('fs-extra');
const pluralize = require('pluralize');

const contentTypeService = require('./ContentTypes');
const { formatAttributes, convertAttributes } = require('../utils/attributes');
const { nameToSlug } = require('../utils/helpers');

/**
 * Formats a component attributes
 * @param {string} uid - string
 * @param {Object} component - strapi component model
 */
const formatComponent = component => {
  const { uid, connection, collectionName, info, category } = component;

  return {
    uid,
    category,
    schema: {
      icon: _.get(info, 'icon'),
      name: _.get(info, 'name') || _.upperFirst(pluralize(uid)),
      description: _.get(info, 'description', ''),
      connection,
      collectionName,
      attributes: formatAttributes(component),
    },
  };
};

/**
 * Creates a component schema file
 * @param {string} uid
 * @param {Object} infos
 */
async function createComponent({ uid, infos }) {
  const schema = createSchema(infos);

  await writeSchema({
    category: nameToSlug(infos.category),
    name: nameToSlug(infos.name),
    schema,
  });

  return { uid };
}

/**
 * Updates a component schema file
 * @param {Object} component
 * @param {Object} infos
 */
async function updateComponent({ component, infos }) {
  const { uid, __schema__: oldSchema } = component;

  // don't update collectionName if not provided
  const updatedSchema = {
    ...oldSchema,
    connection: infos.connection || oldSchema.connection,
    collectionName: infos.collectionName || oldSchema.collectionName,
    info: {
      name: infos.name || oldSchema.info.name,
      icon: infos.icon || oldSchema.info.icon,
      description: infos.description || oldSchema.info.description,
    },
    attributes: convertAttributes(infos.attributes),
  };

  await editSchema({ uid, schema: updatedSchema });

  if (component.category !== infos.category) {
    const oldDir = path.join(strapi.dir, 'components', component.category);
    const newDir = path.join(strapi.dir, 'components', infos.category);

    await fse.move(
      path.join(oldDir, component.__filename__),
      path.join(newDir, component.__filename__)
    );

    const list = await fse.readdir(oldDir);
    if (list.length === 0) {
      await fse.remove(oldDir);
    }

    return {
      uid: `${infos.category}.${component.modelName}`,
    };
  }

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
      collectionName ||
      `components_${nameToSlug(category)}_${pluralize(nameToSlug(name))}`,
    attributes: convertAttributes(attributes),
  };
};

/**
 * Returns a uid from a string
 * @param {string} str - string to slugify
 */
const createComponentUID = ({ category, name }) =>
  `${nameToSlug(category)}.${nameToSlug(name)}`;

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
async function writeSchema({ category, name, schema }) {
  const filePath = path.join(
    strapi.dir,
    'components',
    category,
    `${name}.json`
  );

  await fse.ensureFile(filePath);
  await fse.writeJSON(filePath, schema, { spaces: 2 });
}

/**
 * Edit a component schema file
 */
async function editSchema({ uid, schema }) {
  const { category, __filename__ } = strapi.components[uid];
  const filePath = path.join(strapi.dir, 'components', category, __filename__);

  await fse.ensureFile(filePath);
  await fse.writeJSON(filePath, schema, { spaces: 2 });
}

/**
 * Deletes a component schema file
 * @param {string} ui
 */
async function deleteSchema(uid) {
  const { category, __filename__ } = strapi.components[uid];
  await strapi.fs.removeAppFile(`components/${category}/${__filename__}`);
}

const updateComponentInModels = (oldUID, newUID) => {
  const contentTypeUpdates = Object.keys(strapi.contentTypes).map(uid => {
    const { __schema__: oldSchema } = strapi.contentTypes[uid];

    const componentsToUpdate = Object.keys(oldSchema.attributes).reduce(
      (acc, key) => {
        if (
          oldSchema.attributes[key].type === 'component' &&
          oldSchema.attributes[key].component === oldUID
        ) {
          acc.push(key);
        }

        return acc;
      },
      []
    );

    const dynamiczonesToUpdate = Object.keys(oldSchema.attributes).filter(
      key => {
        return (
          oldSchema.attributes[key].type === 'dynamiczone' &&
          oldSchema.attributes[key].components.includes(oldUID)
        );
      },
      []
    );

    if (componentsToUpdate.length > 0 || dynamiczonesToUpdate.length > 0) {
      const newSchema = _.cloneDeep(oldSchema);

      componentsToUpdate.forEach(key => {
        newSchema.attributes[key].component = newUID;
      });

      dynamiczonesToUpdate.forEach(key => {
        newSchema.attributes[key].components = oldSchema.attributes[
          key
        ].components.map(val => (val !== oldUID ? val : newUID));
      });

      return contentTypeService.writeContentType({ uid, schema: newSchema });
    }

    return Promise.resolve();
  });

  const componentUpdates = Object.keys(strapi.components).map(uid => {
    const { __schema__: oldSchema } = strapi.components[uid];

    const componentsToUpdate = Object.keys(oldSchema.attributes).filter(key => {
      return (
        oldSchema.attributes[key].type === 'component' &&
        oldSchema.attributes[key].component === oldUID
      );
    }, []);

    if (componentsToUpdate.length > 0) {
      const newSchema = {
        ...oldSchema,
      };

      componentsToUpdate.forEach(key => {
        newSchema.attributes[key].component = newUID;
      });

      return editSchema({ uid, schema: newSchema });
    }

    return Promise.resolve();
  });

  return Promise.all([...contentTypeUpdates, ...componentUpdates]);
};

const deleteComponentInModels = async componentUID => {
  const component = strapi.components[componentUID];

  const contentTypeUpdates = Object.keys(strapi.contentTypes).map(uid => {
    const { __schema__: oldSchema } = strapi.contentTypes[uid];

    const componentsToRemove = Object.keys(oldSchema.attributes).filter(key => {
      return (
        oldSchema.attributes[key].type === 'component' &&
        oldSchema.attributes[key].component === componentUID
      );
    }, []);

    const dynamiczonesToUpdate = Object.keys(oldSchema.attributes).filter(
      key => {
        return (
          oldSchema.attributes[key].type === 'dynamiczone' &&
          oldSchema.attributes[key].components.includes(componentUID)
        );
      },
      []
    );

    if (componentsToRemove.length > 0 || dynamiczonesToUpdate.length > 0) {
      const newSchema = _.cloneDeep(oldSchema);

      componentsToRemove.forEach(key => {
        delete newSchema.attributes[key];
      });

      dynamiczonesToUpdate.forEach(key => {
        newSchema.attributes[key] = {
          ...newSchema.attributes[key],
          components: newSchema.attributes[key].components.filter(
            val => val !== componentUID
          ),
        };
      });

      return contentTypeService.writeContentType({ uid, schema: newSchema });
    }

    return Promise.resolve();
  });

  const componentUpdates = Object.keys(strapi.components).map(uid => {
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

      return editSchema({ uid, schema: newSchema });
    }

    return Promise.resolve();
  });

  await Promise.all([...contentTypeUpdates, ...componentUpdates]);

  const categoryDir = path.join(strapi.dir, 'components', component.category);
  const list = await fse.readdir(categoryDir);
  if (list.length === 0) {
    await fse.remove(categoryDir);
  }
};

module.exports = {
  createComponent,
  createComponentUID,
  updateComponent,
  deleteComponent,
  editSchema,
  formatComponent,

  // export for testing only
  createSchema,

  deleteComponentInModels,
  updateComponentInModels,
};

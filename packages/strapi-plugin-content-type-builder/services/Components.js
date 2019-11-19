'use strict';

const path = require('path');
const _ = require('lodash');
const fse = require('fs-extra');
const pluralize = require('pluralize');

const contentTypeService = require('./ContentTypes');
const { formatAttributes } = require('../utils/attributes');
const { nameToSlug } = require('../utils/helpers');
const getSchemaManager = require('./schema-manager');

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

// /**
//  * Updates a component schema file
//  * @param {Object} component
//  * @param {Object} infos
//  */
// async function updateComponent({ component, infos }) {
//   const { uid, __schema__: oldSchema } = component;

//   // don't update collectionName if not provided
//   const updatedSchema = {
//     ...oldSchema,
//     connection: infos.connection || oldSchema.connection,
//     collectionName: infos.collectionName || oldSchema.collectionName,
//     info: {
//       name: infos.name || oldSchema.info.name,
//       icon: infos.icon || oldSchema.info.icon,
//       description: infos.description || oldSchema.info.description,
//     },
//     attributes: convertAttributes(infos.attributes),
//   };

//   await editSchema({ uid, schema: updatedSchema });

//   if (component.category !== infos.category) {
//     const oldDir = path.join(strapi.dir, 'components', component.category);
//     const newDir = path.join(strapi.dir, 'components', infos.category);

//     await fse.move(
//       path.join(oldDir, component.__filename__),
//       path.join(newDir, component.__filename__)
//     );

//     const list = await fse.readdir(oldDir);
//     if (list.length === 0) {
//       await fse.remove(oldDir);
//     }

//     return {
//       uid: `${infos.category}.${component.modelName}`,
//     };
//   }

//   return { uid };
// }

/**
 * Returns a uid from a string
 * @param {string} str - string to slugify
 */
const createComponentUID = ({ category, name }) =>
  `${nameToSlug(category)}.${nameToSlug(name)}`;

/**
 * Returns a uid from a string
 * @param {string} str - string to slugify
 */
const updateComponentUID = (component, { category }) =>
  `${nameToSlug(category)}.${nameToSlug(component.name)}`;

/**
 * Edit a component schema file
 */
async function editSchema({ uid, schema }) {
  const { category, __filename__ } = strapi.components[uid];
  const filePath = path.join(strapi.dir, 'components', category, __filename__);

  await fse.ensureFile(filePath);
  await fse.writeJSON(filePath, schema, { spaces: 2 });
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
      const newSchema = oldSchema;

      componentsToUpdate.forEach(key => {
        newSchema.attributes[key].component = newUID;
      });

      dynamiczonesToUpdate.forEach(key => {
        newSchema.attributes[key].components = oldSchema.attributes[
          key
        ].components.map(val => {
          return val === oldUID ? newUID : val;
        });
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
      const newSchema = oldSchema;

      componentsToUpdate.forEach(key => {
        newSchema.attributes[key].component = newUID;
      });

      return editSchema({ uid, schema: newSchema });
    }

    return Promise.resolve();
  });

  return Promise.all([...contentTypeUpdates, ...componentUpdates]);
};

/**
 * Creates a component and handle the nested components sent with it
 * @param {Object} params params object
 * @param {Object} params.component Main component to create
 * @param {Array<Object>} params.components List of nested components to created or edit
 */
const createComponent = ({ component, components }) => {
  const componentsToCreate = components.filter(compo => !_.has(compo, 'uid'));
  const componentsToEdit = components.filter(compo => _.has(compo, 'uid'));

  return getSchemaManager().edit(ctx => {
    const newComponent = ctx.createComponent(component);

    componentsToCreate.forEach(ctx.createComponent);
    componentsToEdit.forEach(ctx.editComponent);

    return newComponent;
  });
};

/**
 * Edits a component and handle the nested components sent with it
 * @param {Object} params params object
 * @param {Object} params.component Main component to create
 * @param {Array<Object>} params.components List of nested components to created or edit
 */
const editComponent = (uid, { component, components }) => {
  const componentsToCreate = components.filter(compo => !_.has(compo, 'uid'));
  const componentsToEdit = components.filter(compo => _.has(compo, 'uid'));

  return getSchemaManager().edit(ctx => {
    const updatedComponent = ctx.editComponent({
      uid,
      ...component,
    });

    componentsToCreate.forEach(ctx.createComponent);
    componentsToEdit.forEach(ctx.editComponent);

    return updatedComponent;
  });
};

const deleteComponent = uid => {
  return getSchemaManager().edit(ctx => {
    return ctx.deleteComponent(uid);
  });
};

module.exports = {
  createComponentUID,
  updateComponentUID,

  createComponent,
  editComponent,
  deleteComponent,

  editSchema,
  formatComponent,

  updateComponentInModels,
};

'use strict';

const _ = require('lodash');
const { has, prop, omit, toString } = require('lodash/fp');

const { contentTypes: contentTypesUtils } = require('@strapi/utils');
const { ApplicationError } = require('@strapi/utils').errors;
const { getComponentAttributes } = require('@strapi/utils').contentTypes;

const omitComponentData = (contentType, data) => {
  const { attributes } = contentType;
  const componentAttributes = Object.keys(attributes).filter((attributeName) =>
    contentTypesUtils.isComponentAttribute(attributes[attributeName])
  );

  return omit(componentAttributes, data);
};

// NOTE: we could generalize the logic to allow CRUD of relation directly in the DB layer
const createComponents = async (uid, data) => {
  const { attributes = {} } = strapi.getModel(uid);

  const componentBody = {};

  for (const attributeName of Object.keys(attributes)) {
    const attribute = attributes[attributeName];

    if (!has(attributeName, data) || !contentTypesUtils.isComponentAttribute(attribute)) {
      continue;
    }

    if (attribute.type === 'component') {
      const { component: componentUID, repeatable = false } = attribute;

      const componentValue = data[attributeName];

      if (componentValue === null) {
        continue;
      }

      if (repeatable === true) {
        if (!Array.isArray(componentValue)) {
          throw new Error('Expected an array to create repeatable component');
        }

        const components = await Promise.all(
          componentValue.map((value) => createComponent(componentUID, value))
        );

        // TODO: add order
        componentBody[attributeName] = components.map(({ id }, idx) => {
          return {
            id,
            __pivot: {
              order: idx + 1,
              field: attributeName,
              component_type: componentUID,
            },
          };
        });
      } else {
        const component = await createComponent(componentUID, componentValue);
        componentBody[attributeName] = {
          id: component.id,
          __pivot: {
            order: 1,
            field: attributeName,
            component_type: componentUID,
          },
        };
      }

      continue;
    }

    if (attribute.type === 'dynamiczone') {
      const dynamiczoneValues = data[attributeName];

      if (!Array.isArray(dynamiczoneValues)) {
        throw new Error('Expected an array to create repeatable component');
      }

      componentBody[attributeName] = await Promise.all(
        dynamiczoneValues.map(async (value, idx) => {
          const { id } = await createComponent(value.__component, value);
          return {
            id,
            __component: value.__component,
            __pivot: {
              order: idx + 1,
              field: attributeName,
            },
          };
        })
      );

      continue;
    }
  }

  return componentBody;
};

/**
 * @param {str} uid
 * @param {object} entity
 * @return {Promise<{uid: string, entity: object}>}
 */
const getComponents = async (uid, entity) => {
  const componentAttributes = getComponentAttributes(strapi.getModel(uid));

  if (_.isEmpty(componentAttributes)) return {};
  const components = strapi.query(uid).load(entity, componentAttributes);
  return { id: entity?.id, ...components };
};

/*
  delete old components
  create or update
*/
const updateComponents = async (uid, entityToUpdate, data) => {
  const { attributes = {} } = strapi.getModel(uid);

  const componentBody = {};

  for (const attributeName of Object.keys(attributes)) {
    const attribute = attributes[attributeName];

    if (!has(attributeName, data)) {
      continue;
    }

    if (attribute.type === 'component') {
      const { component: componentUID, repeatable = false } = attribute;

      const componentValue = data[attributeName];

      await deleteOldComponents(uid, componentUID, entityToUpdate, attributeName, componentValue);

      if (repeatable === true) {
        if (!Array.isArray(componentValue)) {
          throw new Error('Expected an array to create repeatable component');
        }

        const components = await Promise.all(
          componentValue.map((value) => updateOrCreateComponent(componentUID, value))
        );

        componentBody[attributeName] = components.filter(_.negate(_.isNil)).map(({ id }, idx) => {
          return {
            id,
            __pivot: {
              order: idx + 1,
              field: attributeName,
              component_type: componentUID,
            },
          };
        });
      } else {
        const component = await updateOrCreateComponent(componentUID, componentValue);
        componentBody[attributeName] = component && {
          id: component.id,
          __pivot: {
            order: 1,
            field: attributeName,
            component_type: componentUID,
          },
        };
      }

      continue;
    }

    if (attribute.type === 'dynamiczone') {
      const dynamiczoneValues = data[attributeName];

      await deleteOldDZComponents(uid, entityToUpdate, attributeName, dynamiczoneValues);

      if (!Array.isArray(dynamiczoneValues)) {
        throw new Error('Expected an array to create repeatable component');
      }

      componentBody[attributeName] = await Promise.all(
        dynamiczoneValues.map(async (value, idx) => {
          const { id } = await updateOrCreateComponent(value.__component, value);

          return {
            id,
            __component: value.__component,
            __pivot: {
              order: idx + 1,
              field: attributeName,
            },
          };
        })
      );

      continue;
    }
  }

  return componentBody;
};

const deleteOldComponents = async (
  uid,
  componentUID,
  entityToUpdate,
  attributeName,
  componentValue
) => {
  const previousValue = await strapi.query(uid).load(entityToUpdate, attributeName);

  const idsToKeep = _.castArray(componentValue).filter(has('id')).map(prop('id')).map(toString);

  const allIds = _.castArray(previousValue).filter(has('id')).map(prop('id')).map(toString);

  idsToKeep.forEach((id) => {
    if (!allIds.includes(id)) {
      throw new ApplicationError(
        `Some of the provided components in ${attributeName} are not related to the entity`
      );
    }
  });

  const idsToDelete = _.difference(allIds, idsToKeep);

  if (idsToDelete.length > 0) {
    for (const idToDelete of idsToDelete) {
      await deleteComponent(componentUID, { id: idToDelete });
    }
  }
};

const deleteOldDZComponents = async (uid, entityToUpdate, attributeName, dynamiczoneValues) => {
  const previousValue = await strapi.query(uid).load(entityToUpdate, attributeName);

  const idsToKeep = _.castArray(dynamiczoneValues)
    .filter(has('id'))
    .map(({ id, __component }) => ({
      id: toString(id),
      __component,
    }));

  const allIds = _.castArray(previousValue)
    .filter(has('id'))
    .map(({ id, __component }) => ({
      id: toString(id),
      __component,
    }));

  idsToKeep.forEach(({ id, __component }) => {
    if (!allIds.find((el) => el.id === id && el.__component === __component)) {
      const err = new Error(
        `Some of the provided components in ${attributeName} are not related to the entity`
      );
      err.status = 400;
      throw err;
    }
  });

  const idsToDelete = allIds.reduce((acc, { id, __component }) => {
    if (!idsToKeep.find((el) => el.id === id && el.__component === __component)) {
      acc.push({ id, __component });
    }

    return acc;
  }, []);

  if (idsToDelete.length > 0) {
    for (const idToDelete of idsToDelete) {
      const { id, __component } = idToDelete;
      await deleteComponent(__component, { id });
    }
  }
};

const deleteComponents = async (uid, entityToDelete) => {
  const { attributes = {} } = strapi.getModel(uid);

  for (const attributeName of Object.keys(attributes)) {
    const attribute = attributes[attributeName];

    if (attribute.type === 'component') {
      const { component: componentUID } = attribute;

      // Load attribute value if it's not already loaded
      const value =
        entityToDelete[attributeName] ||
        (await strapi.query(uid).load(entityToDelete, attributeName));

      if (!value) {
        continue;
      }

      if (Array.isArray(value)) {
        await Promise.all(value.map((subValue) => deleteComponent(componentUID, subValue)));
      } else {
        await deleteComponent(componentUID, value);
      }

      continue;
    }

    if (attribute.type === 'dynamiczone') {
      const value =
        entityToDelete[attributeName] ||
        (await strapi.query(uid).load(entityToDelete, attributeName));

      if (!value) {
        continue;
      }

      if (Array.isArray(value)) {
        await Promise.all(value.map((subValue) => deleteComponent(subValue.__component, subValue)));
      }

      continue;
    }
  }
};

/** *************************
    Component queries
************************** */

// components can have nested compos so this must be recursive
const createComponent = async (uid, data) => {
  const model = strapi.getModel(uid);

  const componentData = await createComponents(uid, data);

  return strapi.query(uid).create({
    data: Object.assign(omitComponentData(model, data), componentData),
  });
};

// components can have nested compos so this must be recursive
const updateComponent = async (uid, componentToUpdate, data) => {
  const model = strapi.getModel(uid);

  const componentData = await updateComponents(uid, componentToUpdate, data);

  return strapi.query(uid).update({
    where: {
      id: componentToUpdate.id,
    },
    data: Object.assign(omitComponentData(model, data), componentData),
  });
};

const updateOrCreateComponent = (componentUID, value) => {
  if (value === null) {
    return null;
  }

  // update
  if (has('id', value)) {
    // TODO: verify the compo is associated with the entity
    return updateComponent(componentUID, { id: value.id }, value);
  }

  // create
  return createComponent(componentUID, value);
};

const deleteComponent = async (uid, componentToDelete) => {
  await deleteComponents(uid, componentToDelete);
  await strapi.query(uid).delete({ where: { id: componentToDelete.id } });
};

module.exports = {
  omitComponentData,
  getComponents,
  createComponents,
  updateComponents,
  deleteComponents,
  deleteComponent,
};

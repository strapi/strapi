'use strict';

const _ = require('lodash');
const pluralize = require('pluralize');

const { formatAttributes } = require('../utils/attributes');
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

/**
 * Creates a component and handle the nested components sent with it
 * @param {Object} params params object
 * @param {Object} params.component Main component to create
 * @param {Array<Object>} params.components List of nested components to created or edit
 */
const createComponent = ({ component, components = [] }) => {
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
const editComponent = (uid, { component, components = [] }) => {
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
  createComponent,
  editComponent,
  deleteComponent,

  formatComponent,
};

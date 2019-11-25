'use strict';

const _ = require('lodash');
const pluralize = require('pluralize');

const { formatAttributes } = require('../utils/attributes');
const createBuilder = require('./schema-builder');

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
const createComponent = async ({ component, components = [] }) => {
  const componentsToCreate = components.filter(compo => !_.has(compo, 'uid'));
  const componentsToEdit = components.filter(compo => _.has(compo, 'uid'));

  const builder = createBuilder();

  const newComponent = builder.createComponent(component);

  componentsToCreate.forEach(component => builder.createComponent(component));
  componentsToEdit.forEach(component => builder.editComponent(component));

  await builder.writeFiles();
  return newComponent;
};

/**
 * Edits a component and handle the nested components sent with it
 * @param {Object} params params object
 * @param {Object} params.component Main component to create
 * @param {Array<Object>} params.components List of nested components to created or edit
 */
const editComponent = async (uid, { component, components = [] }) => {
  const componentsToCreate = components.filter(compo => !_.has(compo, 'uid'));
  const componentsToEdit = components.filter(compo => _.has(compo, 'uid'));

  const builder = createBuilder();

  const updatedComponent = builder.editComponent({
    ...component,
    uid,
  });

  componentsToCreate.forEach(component => builder.createComponent(component));
  componentsToEdit.forEach(component => builder.editComponent(component));

  await builder.writeFiles();
  return updatedComponent;
};

const deleteComponent = async uid => {
  const builder = createBuilder();

  const deletedComponent = builder.deleteComponent(uid);

  await builder.writeFiles();
  return deletedComponent;
};

module.exports = {
  createComponent,
  editComponent,
  deleteComponent,

  formatComponent,
};

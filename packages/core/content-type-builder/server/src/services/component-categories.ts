import { join } from 'path';
import { errors, nameToSlug } from '@strapi/utils';

import createBuilder from './schema-builder';

const { ApplicationError } = errors;

/**
 * Edit a category name and move components to the write folder
 * @param {string} name category name
 * @param {Object} infos new category data
 */
export const editCategory = async (name, infos) => {
  const newName = nameToSlug(infos.name);

  // don't do anything the name doesn't change
  if (name === newName) return;

  if (!categoryExists(name)) {
    throw new ApplicationError('category not found');
  }

  if (categoryExists(newName)) {
    throw new ApplicationError('Name already taken');
  }

  const builder = createBuilder();

  builder.components.forEach((component) => {
    const oldUID = component.uid;
    const newUID = `${newName}.${component.modelName}`;

    // only edit the components in this specific category
    if (component.category !== name) return;

    component.setUID(newUID).setDir(join(strapi.dirs.app.components, newName));

    builder.components.forEach((compo) => {
      compo.updateComponent(oldUID, newUID);
    });

    builder.contentTypes.forEach((ct) => {
      ct.updateComponent(oldUID, newUID);
    });
  });

  await builder.writeFiles();

  return newName;
};

/**
 * Deletes a category and its components
 * @param {string} name category name to delete
 */
export const deleteCategory = async (name) => {
  if (!categoryExists(name)) {
    throw new ApplicationError('category not found');
  }

  const builder = createBuilder();

  builder.components.forEach((component) => {
    if (component.category === name) {
      builder.deleteComponent(component.uid);
    }
  });

  await builder.writeFiles();
};

/**
 * Checks if a category exists
 * @param {string} name category name to serach for
 */
const categoryExists = (name) => {
  const matchingIndex = Object.values(strapi.components).findIndex(
    (component) => component.category === name
  );

  return matchingIndex > -1;
};

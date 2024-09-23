import { join } from 'path';
import { strings, errors } from '@strapi/utils';
import type { Struct } from '@strapi/types';
import createBuilder from './schema-builder';

type Infos = {
  name: string;
};

interface WorkingComponent extends Struct.ComponentSchema {
  setUID: (uid: string) => WorkingComponent;
  setDir: (dir: string) => WorkingComponent;
  updateComponent: (oldUID: string, newUID: string) => void;
}

/**
 * Edit a category name and move components to the write folder
 */
export const editCategory = async (name: string, infos: Infos) => {
  const newName = strings.nameToSlug(infos.name);

  // don't do anything the name doesn't change
  if (name === newName) return;

  if (!categoryExists(name)) {
    throw new errors.ApplicationError('category not found');
  }

  if (categoryExists(newName)) {
    throw new errors.ApplicationError('Name already taken');
  }

  const builder = createBuilder();

  builder.components.forEach((component: WorkingComponent) => {
    const oldUID = component.uid;
    const newUID = `${newName}.${component.modelName}`;

    // only edit the components in this specific category
    if (component.category !== name) return;

    component.setUID(newUID).setDir(join(strapi.dirs.app.components, newName));

    builder.components.forEach((compo: WorkingComponent) => {
      compo.updateComponent(oldUID, newUID);
    });

    builder.contentTypes.forEach((ct: WorkingComponent) => {
      ct.updateComponent(oldUID, newUID);
    });
  });

  await builder.writeFiles();

  return newName;
};

/**
 * Deletes a category and its components
 */
export const deleteCategory = async (name: string) => {
  if (!categoryExists(name)) {
    throw new errors.ApplicationError('category not found');
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
 */
const categoryExists = (name: string) => {
  const matchingIndex = Object.values(strapi.components).findIndex(
    (component) => component.category === name
  );

  return matchingIndex > -1;
};

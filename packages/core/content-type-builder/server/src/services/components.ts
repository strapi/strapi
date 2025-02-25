import type { Internal, Struct } from '@strapi/types';
import { has } from 'lodash';

import { formatAttributes, replaceTemporaryUIDs } from '../utils/attributes';
import createBuilder from './schema-builder';

/**
 * Formats a component attributes
 */
export const formatComponent = (component: any): Struct.ComponentSchema => {
  const { uid, globalId, modelName, collectionName, info, category, modelType } = component;

  return {
    uid,
    modelName,
    globalId,
    modelType,
    collectionName,
    category,
    info,
    attributes: formatAttributes(component),
  };
};

/**
 * Creates a component and handle the nested components sent with it
 */
export const createComponent = async ({ component, components = [] }: any) => {
  const builder = createBuilder();

  const uidMap = builder.createNewComponentUIDMap(components);
  const replaceTmpUIDs = replaceTemporaryUIDs(uidMap);

  const newComponent = builder.createComponent(replaceTmpUIDs(component));

  components.forEach((component: any) => {
    if (!has(component, 'uid')) {
      return builder.createComponent(replaceTmpUIDs(component));
    }

    return builder.editComponent(replaceTmpUIDs(component));
  });

  await builder.writeFiles();

  strapi.eventHub.emit('component.create', { component: newComponent });

  return newComponent;
};

type ComponentToCreate = {
  component: Struct.ComponentSchema;
  components?: Struct.ComponentSchema[];
};

export const editComponent = async (
  uid: Internal.UID.Component,
  { component, components = [] }: ComponentToCreate
) => {
  const builder = createBuilder();

  const uidMap = builder.createNewComponentUIDMap(components);
  const replaceTmpUIDs = replaceTemporaryUIDs(uidMap);

  const updatedComponent = builder.editComponent({
    uid,
    ...replaceTmpUIDs(component),
  });

  components.forEach((component) => {
    if (!has(component, 'uid')) {
      return builder.createComponent(replaceTmpUIDs(component));
    }

    return builder.editComponent(replaceTmpUIDs(component));
  });

  await builder.writeFiles();

  strapi.eventHub.emit('component.update', { component: updatedComponent });

  return updatedComponent;
};

export const deleteComponent = async (uid: Internal.UID.Component) => {
  const builder = createBuilder();

  const deletedComponent = builder.deleteComponent(uid);

  await builder.writeFiles();

  strapi.eventHub.emit('component.delete', { component: deletedComponent });

  return deletedComponent;
};

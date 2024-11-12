import type { Internal, Struct } from '@strapi/types';
import { get, has } from 'lodash';

import { formatAttributes, replaceTemporaryUIDs } from '../utils/attributes';
import createBuilder from './schema-builder';

/**
 * Formats a component attributes
 */
export const formatComponent = (component: any) => {
  const { uid, modelName, connection, collectionName, info, category } = component;

  return {
    uid,
    category,
    apiId: modelName,
    schema: {
      displayName: get(info, 'displayName'),
      description: get(info, 'description', ''),
      icon: get(info, 'icon'),
      connection,
      collectionName,
      pluginOptions: component.pluginOptions,
      attributes: formatAttributes(component),
    },
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

export const hasComponents = (
  contentType: any
): contentType is any & { type: 'dynamiczone' | 'component' } => {
  return Object.values(contentType.attributes || {}).some(
    (({ type }: { type: string }) => type === 'dynamiczone' || type === 'component') as any
  );
};

export const deleteComponent = async (deleteUid: Internal.UID.Component) => {
  const builder = createBuilder();

  const deletedComponent = builder.deleteComponent(deleteUid);

  // Combine components and content types into one iterable array of entries
  const allTypes = [...builder.contentTypes.entries(), ...builder.components.entries()];

  // Delete this component from the cmps tables
  for (const [modelUid, modelObject] of allTypes) {
    // TODO: is there a better way to identify this?
    // ensure this type has at least one component attribute and thus a components table
    if (
      !Object.values(modelObject.schema.attributes).some((attr: any) => attr.type === 'component')
    ) {
      continue;
    }

    // Determine if the entry is a component or content type
    const isComponent = builder.components.has(modelUid);

    // Construct the table name based on whether it's a component or content type
    // TODO: use metadata get name methods instead of hardcoding or this will break with long names
    const tableName = isComponent
      ? `components_${modelObject.modelName}_cmps`
      : `${modelObject.schema.info.pluralName}_cmps`;

    // TODO: do we need a try/catch here in case there are edge cases we haven't considered?
    await strapi.db.connection.delete().from(tableName).where('component_type', deleteUid);
  }

  await builder.writeFiles();

  strapi.eventHub.emit('component.delete', { component: deletedComponent });

  return deletedComponent;
};

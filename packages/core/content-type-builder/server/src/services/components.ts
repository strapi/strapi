import type { Core, Internal, Struct } from '@strapi/types';
import { errors } from '@strapi/utils';
import { get, has } from 'lodash';

import { formatAttributes, replaceTemporaryUIDs } from '../utils/attributes';
import { emitSchemaEvent } from '../utils/events';
import createBuilder from './schema-builder';
import type { SchemaHandler } from './schema-builder/schema-handler';
import type { ComponentsService, EditComponentPayload } from '../types/services';

/**
 * Formats a component attributes
 */
export const formatComponent = ((component) => {
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
}) satisfies Core.Implements<ComponentsService['formatComponent']>;

/**
 * Creates a component and handle the nested components sent with it
 */
export const createComponent = (async ({
  component,
  components = [],
}): Promise<SchemaHandler<Internal.UID.Component>> => {
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

  await emitSchemaEvent('component.create', { component: newComponent });

  return newComponent;
}) satisfies Core.Implements<ComponentsService['createComponent']>;

/**
 * A component in a Content-Type Builder payload: the `info` fields sit at the top level,
 * unlike the loaded `Struct.ComponentSchema`.
 */
export type ComponentInput = {
  category: string;
  displayName: string;
  icon?: string;
  description?: string;
  options?: Struct.SchemaOptions;
  pluginOptions?: Struct.SchemaPluginOptions;
  collectionName?: string;
  attributes: Record<string, unknown>;
};

/**
 * A component sent along with the edited one: an existing component to update (by `uid`),
 * or a new one with a temporary uid that attributes in the same payload can reference.
 */
export type NestedComponentInput = ComponentInput &
  ({ uid: Internal.UID.Component; tmpUID?: never } | { tmpUID: string; uid?: never });

export type ComponentToCreate = {
  component: ComponentInput;
  components?: NestedComponentInput[];
};

export const editComponent = (async (
  uid: Internal.UID.Component,
  {
    component,
    components = [],
  }: Core.IsStrict extends true ? EditComponentPayload : ComponentToCreate
): Promise<SchemaHandler<Internal.UID.Component>> => {
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

  const filesWritten = await builder.writeFiles();

  // The builder already rolled the files back
  if (filesWritten === false) {
    throw new errors.ApplicationError('Invalid schema edition');
  }

  await emitSchemaEvent('component.update', { component: updatedComponent });

  return updatedComponent;
}) satisfies Core.Implements<ComponentsService['editComponent']>;

export const deleteComponent = (async (uid: Internal.UID.Component) => {
  const builder = createBuilder();

  const deletedComponent = builder.deleteComponent(uid);

  await builder.writeFiles();

  await emitSchemaEvent('component.delete', { component: deletedComponent });

  return deletedComponent;
}) satisfies Core.Implements<ComponentsService['deleteComponent']>;

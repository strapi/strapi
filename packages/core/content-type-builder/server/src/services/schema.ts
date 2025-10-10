import utils from '@strapi/utils';
import { mapValues } from 'lodash/fp';

import type { Schema } from '@strapi/types';

import createBuilder from './schema-builder';
import { getService } from '../utils';
import type { Schema as CTBSchema } from '../controllers/validation/schema';
import { getRestrictRelationsTo, isContentTypeVisible } from './content-types';

const removeEmptyDefaultsOnUpdates = (schema: CTBSchema) => {
  schema.components.forEach((component) => {
    if (component.action === 'delete') {
      return;
    }

    component.attributes.forEach((attribute) => {
      if (attribute.action === 'update') {
        const { properties } = attribute;

        if ('default' in properties && properties.default === '') {
          properties.default = undefined;
        }
      }
    });
  });

  schema.contentTypes.forEach((contentType) => {
    if (contentType.action === 'delete') {
      return;
    }

    contentType.attributes.forEach((attribute) => {
      if (attribute.action === 'update') {
        const { properties } = attribute;

        if ('default' in properties && properties.default === '') {
          properties.default = undefined;
        }
      }
    });
  });
};

const removeDeletedUIDTargetFieldsOnUpdates = (schema: CTBSchema) => {
  schema.contentTypes.forEach((contentType) => {
    if (contentType.action === 'delete') {
      return;
    }

    contentType.attributes.forEach((attribute) => {
      if (attribute.action === 'update') {
        const { properties } = attribute;

        if (
          properties.type === 'uid' &&
          properties.targetField &&
          !contentType.attributes.find((attr) => attr.name === properties.targetField)
        ) {
          properties.targetField = undefined;
        }
      }
    });
  });
};

const formatAttributes = (model: any) => {
  const { getVisibleAttributes } = utils.contentTypes;

  // only get attributes that can be seen in the CTB
  return getVisibleAttributes(model).map((key) => {
    return { ...formatAttribute(model.attributes[key]), name: key };
  });
};

export const formatAttribute = (attribute: Schema.Attribute.AnyAttribute & Record<string, any>) => {
  if (attribute.type === 'relation') {
    return {
      ...attribute,
      targetAttribute: attribute.inversedBy || attribute.mappedBy || null,
      // Explicitly preserve conditions if they exist
      ...(attribute.conditions && { conditions: attribute.conditions }),
    };
  }

  return attribute;
};

export const getSchema = async () => {
  const contentTypes = mapValues((contentType) => {
    const {
      uid,
      options,
      globalId,
      pluginOptions,
      kind,
      modelName,
      plugin,
      collectionName,
      info,
      modelType,
    } = contentType;

    return {
      uid,
      modelName,
      kind,
      globalId,
      options,
      pluginOptions,
      plugin,
      collectionName,
      info,
      modelType,
      attributes: formatAttributes(contentType),
      visible: isContentTypeVisible(contentType),
      restrictRelationsTo: getRestrictRelationsTo(contentType),
    };
  }, strapi.contentTypes);

  const components = mapValues((component) => {
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
  }, strapi.components);

  return {
    contentTypes,
    components,
  };
};

export const updateSchema = async (schema: CTBSchema) => {
  const builder = createBuilder();
  const apiHandler = getService('api-handler');

  const { components, contentTypes } = schema;

  // pre-process data
  removeEmptyDefaultsOnUpdates(schema);
  removeDeletedUIDTargetFieldsOnUpdates(schema);

  // we pre create empty typesk
  for (const contentType of contentTypes) {
    if (contentType.action === 'create') {
      builder.createContentType({
        ...contentType,
        attributes: {},
      });
    }
  }

  // we pre create empty types
  for (const component of components) {
    if (component.action === 'create') {
      builder.createComponent({
        ...component,
        attributes: {},
      });
    }
  }

  for (const contentType of contentTypes) {
    const { action, uid } = contentType;

    if (action === 'create') {
      builder.createContentTypeAttributes(
        uid,
        contentType.attributes.reduce((acc: any, attr: any) => {
          acc[attr.name] = attr.properties;
          return acc;
        }, {})
      );

      await getService('content-types').generateAPI({
        displayName: contentType!.displayName,
        singularName: contentType!.singularName,
        pluralName: contentType!.pluralName,
        kind: contentType!.kind,
      });
    }

    if (action === 'update') {
      builder.editContentType({
        ...contentType,
        attributes: contentType.attributes.reduce((acc: any, attr: any) => {
          // NOTE: handle renaming migrations here by comparing attr name & attr.properties.name

          if (attr.action === 'delete') {
            return acc;
          }

          acc[attr.name] = attr.properties;
          return acc;
        }, {}),
      });
    }

    if (action === 'delete') {
      builder.deleteContentType(uid);
      await apiHandler.backup(uid);
    }
  }

  for (const component of components) {
    const { action, uid } = component;

    if (action === 'create') {
      builder.createComponentAttributes(
        uid,
        component.attributes.reduce((acc: any, attr: any) => {
          acc[attr.name] = attr.properties;
          return acc;
        }, {})
      );
    }

    if (action === 'update') {
      builder.editComponent({
        ...component,
        attributes: component.attributes.reduce((acc: any, attr: any) => {
          if (attr.action === 'delete') {
            return acc;
          }

          acc[attr.name] = attr.properties;
          return acc;
        }, {}),
      });
    }

    if (action === 'delete') {
      builder.deleteComponent(uid);
    }
  }

  // run sanity checks on the schema
  // Relations target existing types
  // Bidirectional relation have their counterpart in the schema
  // Components target existing components
  // Nested components target existing components
  // Dynamic zones target existing components

  const APIsToDelete = contentTypes
    .filter((ct: any) => ct.action === 'delete')
    .map((ct: any) => ct.uid);

  await builder.writeFiles();

  try {
    for (const uid of APIsToDelete) {
      await apiHandler.clear(uid);
    }
  } catch (error) {
    strapi.log.error(error);
    for (const uid of APIsToDelete) {
      await apiHandler.rollback(uid);
    }
  }

  for (const contentType of contentTypes) {
    if (contentType.action === 'delete') {
      strapi.eventHub.emit('content-type.delete', {
        contentType: builder.contentTypes.get(contentType.uid),
      });
    }

    if (contentType.action === 'update') {
      strapi.eventHub.emit('content-type.update', {
        contentType: builder.contentTypes.get(contentType.uid),
      });
    }

    if (contentType.action === 'create') {
      strapi.eventHub.emit('content-type.create', {
        contentType: builder.contentTypes.get(contentType.uid),
      });
    }
  }

  for (const component of components) {
    if (component.action === 'delete') {
      strapi.eventHub.emit('component.delete', {
        component: builder.components.get(component.uid),
      });
    }

    if (component.action === 'update') {
      strapi.eventHub.emit('component.update', {
        component: builder.components.get(component.uid),
      });
    }

    if (component.action === 'create') {
      strapi.eventHub.emit('component.create', {
        component: builder.components.get(component.uid),
      });
    }
  }
};

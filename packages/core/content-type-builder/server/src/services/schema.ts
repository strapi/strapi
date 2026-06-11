import utils from '@strapi/utils';
import { mapValues } from 'lodash/fp';

import type { Schema } from '@strapi/types';

import createBuilder from './schema-builder';
import { createMigrationBuilder } from './migration-builder';
import { getService } from '../utils';
import type { Schema as CTBSchema } from '../controllers/validation/schema';
import type { RenameMigrationMode } from '../config';
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

interface CollectedRename {
  uid: string;
  oldName: string;
  newName: string;
}

const getRenameMigrationMode = (): RenameMigrationMode => {
  try {
    return strapi.plugin('content-type-builder').config('renameMigrations', 'modal');
  } catch {
    return 'modal';
  }
};

/**
 * Collects attribute renames from the update-schema payload. The admin sends an
 * ordered `renames` array per updated content-type / component: the exact path
 * of rename hops the user performed (e.g. `a -> tmp`, `b -> a`, `tmp -> b` for a
 * swap). Order is preserved so the generated migration can replay each hop
 * verbatim — which is inherently collision-free because the Content-Type Builder
 * never allows two fields to share a name at any instant.
 */
const collectRenames = (schema: CTBSchema): CollectedRename[] => {
  const renames: CollectedRename[] = [];

  type RenameHop = { oldName?: string; newName?: string };
  type RenameAwareEntry = { action?: string; uid: string; renames?: RenameHop[] };

  const collectFrom = (entries: RenameAwareEntry[]) => {
    entries
      .filter((entry) => entry.action === 'update' && Array.isArray(entry.renames))
      .forEach((entry) => {
        entry.renames!.forEach((hop) => {
          if (hop.oldName && hop.newName && hop.oldName !== hop.newName) {
            renames.push({ uid: entry.uid, oldName: hop.oldName, newName: hop.newName });
          }
        });
      });
  };

  collectFrom(schema.contentTypes as unknown as RenameAwareEntry[]);
  collectFrom(schema.components as unknown as RenameAwareEntry[]);

  return renames;
};

/**
 * Generates a single data-preserving rename migration for the accepted renames
 * in this save. Must run before the server reloads, while `strapi.db.metadata`
 * still reflects the old (pre-rename) schema.
 */
const generateRenameMigrations = async (schema: CTBSchema): Promise<void> => {
  if (getRenameMigrationMode() === 'always-off') {
    return;
  }

  const renames = collectRenames(schema);
  if (renames.length === 0) {
    return;
  }

  const migrationBuilder = createMigrationBuilder({ strapi });

  for (const { uid, oldName, newName } of renames) {
    migrationBuilder.addRenameAttribute(uid, { oldName, newName });
  }

  const unsupported = migrationBuilder.getUnsupported();
  if (unsupported.length > 0) {
    const fields = unsupported.map((u) => `${u.uid}.${u.oldName}`).join(', ');
    strapi.log.warn(
      `[content-type-builder] Could not generate a rename migration for ${unsupported.length} field(s) (polymorphic/morph relations and media fields are not yet supported): ${fields}. Data in these fields may not be preserved.`
    );
  }

  if (migrationBuilder.hasChanges()) {
    await migrationBuilder.writeFiles();
  }
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

      if (!contentType.plugin) {
        await getService('content-types').generateAPI({
          displayName: contentType!.displayName,
          singularName: contentType!.singularName,
          pluralName: contentType!.pluralName,
          kind: contentType!.kind,
        });
      }
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

  // Generate rename migrations before reloading, while strapi.db.metadata still
  // reflects the pre-rename schema (the controller triggers the reload after this).
  await generateRenameMigrations(schema);

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

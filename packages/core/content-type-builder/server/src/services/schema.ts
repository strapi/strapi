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
    return strapi.plugin('content-type-builder').config('renameMigrations', 'prompt');
  } catch {
    return 'prompt';
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

interface CollectedComponentRename {
  oldUid: string;
  newUid: string;
}

/**
 * Collects component-level renames from the update-schema payload. A component's
 * uid is `<category>.<name>`; the CTB only lets the *category* change on an edit
 * (the name part is preserved), so a new category yields a new uid. We derive the
 * new uid exactly as the schema builder's `editComponent` does so the generated
 * migration targets the same uid the reload will write to disk.
 */
const collectComponentRenames = (schema: CTBSchema): CollectedComponentRename[] => {
  type ComponentEntry = { action?: string; uid?: string; category?: string };

  return (schema.components as unknown as ComponentEntry[])
    .filter((entry) => entry.action === 'update' && !!entry.uid && !!entry.category)
    .map((entry) => {
      const [, nameUID] = entry.uid!.split('.');
      const newUid = `${utils.strings.nameToSlug(entry.category!)}.${nameUID}`;
      return { oldUid: entry.uid!, newUid };
    })
    .filter((rename) => rename.oldUid !== rename.newUid);
};

/**
 * Generates a single data-preserving rename migration for the accepted renames
 * in this save. Must run before the server reloads, while `strapi.db.metadata`
 * still reflects the old (pre-rename) schema.
 */
const generateRenameMigrations = async (schema: CTBSchema): Promise<void> => {
  // 'never' never generates. 'always' and 'prompt' both generate a migration
  // for every rename that reaches the server: in 'prompt' mode the admin prompts
  // the user and strips any refused rename from the payload before sending, so
  // by the time we get here the remaining renames are exactly the accepted ones.
  if (getRenameMigrationMode() === 'never') {
    return;
  }

  const renames = collectRenames(schema);
  const componentRenames = collectComponentRenames(schema);
  if (renames.length === 0 && componentRenames.length === 0) {
    return;
  }

  const migrationBuilder = createMigrationBuilder({ strapi });

  for (const { uid, oldName, newName } of renames) {
    migrationBuilder.addRenameAttribute(uid, { oldName, newName });
  }

  for (const { oldUid, newUid } of componentRenames) {
    migrationBuilder.addRenameComponent({ oldUid, newUid });
  }

  const unsupported = migrationBuilder.getUnsupported();
  if (unsupported.length > 0) {
    const fields = unsupported.map((u) => `${u.uid}.${u.oldName}`).join(', ');
    strapi.log.warn(
      `[content-type-builder] Could not generate a rename migration for ${unsupported.length} field(s) (polymorphic/morph relations are not supported): ${fields}. Data in these fields may not be preserved.`
    );
  }

  if (migrationBuilder.hasChanges()) {
    await migrationBuilder.writeFiles();
  }
};

/**
 * Renames a single attribute on a content-type or component and generates the
 * data-preserving migration in one step. Used by the `strapi rename:field` CLI
 * command so scripted / non-UI workflows get the same behaviour as the admin.
 *
 * It reuses the regular `updateSchema` path (and therefore the same rename
 * resolver via `generateRenameMigrations`), so the migration is resolved against
 * the pre-reload `strapi.db.metadata` exactly like the admin save. The caller is
 * responsible for not reloading before this resolves (the CLI simply exits).
 */
export const renameAttribute = async (
  uid: string,
  oldName: string,
  newName: string
): Promise<void> => {
  const { ApplicationError } = utils.errors;

  if (!oldName || !newName) {
    throw new ApplicationError('Both an old and a new attribute name are required');
  }

  if (oldName === newName) {
    throw new ApplicationError(`Cannot rename "${oldName}" to itself`);
  }

  const contentType = (strapi.contentTypes as Record<string, any>)[uid];
  const component = (strapi.components as Record<string, any>)[uid];
  const model = contentType ?? component;

  if (!model) {
    throw new ApplicationError(`No content-type or component found for uid "${uid}"`);
  }

  if (!model.attributes?.[oldName]) {
    throw new ApplicationError(`Attribute "${oldName}" does not exist on "${uid}"`);
  }

  if (model.attributes?.[newName]) {
    throw new ApplicationError(`Attribute "${newName}" already exists on "${uid}"`);
  }

  // Reuse the formatted, CTB-visible attributes (same shape the admin sends) so
  // the schema edit matches an admin save and the renamed key is the only change.
  const formattedSchema = await getSchema();
  const isComponent = Boolean(component);
  const entry = isComponent
    ? (formattedSchema.components as Record<string, any>)[uid]
    : (formattedSchema.contentTypes as Record<string, any>)[uid];

  const attributes = entry.attributes.map(({ name, ...properties }: Record<string, any>) => ({
    action: 'update',
    name: name === oldName ? newName : name,
    properties,
  }));

  const renames = [{ oldName, newName }];

  const payload = isComponent
    ? {
        contentTypes: [],
        components: [
          {
            action: 'update',
            uid,
            category: model.category,
            displayName: model.info?.displayName,
            icon: model.info?.icon,
            description: model.info?.description,
            pluginOptions: model.pluginOptions,
            renames,
            attributes,
          },
        ],
      }
    : {
        contentTypes: [
          {
            action: 'update',
            uid,
            kind: model.kind,
            displayName: model.info?.displayName,
            description: model.info?.description,
            draftAndPublish: Boolean(model.options?.draftAndPublish),
            options: model.options,
            pluginOptions: model.pluginOptions,
            renames,
            attributes,
          },
        ],
        components: [],
      };

  await updateSchema(payload as unknown as CTBSchema);
};

/**
 * Moves a component to a new category (which changes its uid from
 * `<oldCategory>.<name>` to `<newCategory>.<name>`) and generates the migration
 * that preserves embedded data, in one step. Used by `strapi rename:component`.
 *
 * Like `renameAttribute`, it reuses the regular `updateSchema` path so the
 * component rename is resolved by the same `generateRenameMigrations` →
 * `createMigrationBuilder` flow the admin uses (which migrates the
 * `component_type` value in every `*_cmps` link table referencing the component).
 */
export const renameComponent = async (uid: string, newCategory: string): Promise<void> => {
  const { ApplicationError } = utils.errors;

  if (!newCategory) {
    throw new ApplicationError('A new category is required');
  }

  const component = (strapi.components as Record<string, any>)[uid];

  if (!component) {
    throw new ApplicationError(`No component found for uid "${uid}"`);
  }

  // A component uid is `<category>.<name>`; only the category can change (the
  // name part is preserved), exactly as `editComponent` derives the new uid.
  const [, nameUID] = uid.split('.');
  const newUid = `${utils.strings.nameToSlug(newCategory)}.${nameUID}`;

  if (newUid === uid) {
    throw new ApplicationError(`Component "${uid}" is already in category "${newCategory}"`);
  }

  if ((strapi.components as Record<string, any>)[newUid]) {
    throw new ApplicationError(`A component "${newUid}" already exists`);
  }

  const formattedSchema = await getSchema();
  const entry = (formattedSchema.components as Record<string, any>)[uid];

  const attributes = entry.attributes.map(({ name, ...properties }: Record<string, any>) => ({
    action: 'update',
    name,
    properties,
  }));

  const payload = {
    contentTypes: [],
    components: [
      {
        action: 'update',
        uid,
        category: newCategory,
        displayName: component.info?.displayName,
        icon: component.info?.icon,
        description: component.info?.description,
        pluginOptions: component.pluginOptions,
        attributes,
      },
    ],
  };

  await updateSchema(payload as unknown as CTBSchema);
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
    settings: {
      // Surface the rename-migration mode so the admin can decide whether to
      // prompt, always generate, or never generate rename migrations.
      renameMigrations: getRenameMigrationMode(),
    },
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

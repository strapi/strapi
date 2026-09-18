import { contentTypes as contentTypesUtils, errors, strings } from '@strapi/utils';
import { mapValues } from 'lodash/fp';

import type { Schema } from '@strapi/types';

import createBuilder from './schema-builder';
import { getComponentCollectionName } from './schema-builder/component-builder';
import { createMigrationBuilder } from './migration-builder';
import type { RenameAttributeDefinition, UnsupportedRename } from './migration-builder';
import { getService } from '../utils';
import type { Schema as CTBSchema } from '../controllers/validation/schema';
import type { AttributeRenameMigrationMode } from '../config';
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
  newAttribute?: RenameAttributeDefinition;
}

const getAttributeRenameMigrationMode = (): AttributeRenameMigrationMode => {
  return strapi
    .plugin('content-type-builder')
    .config('renameMigrations.attributes', 'prompt-before-save');
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
  type AttributeEntry = { action?: string; name?: string; properties?: RenameAttributeDefinition };
  type RenameAwareEntry = {
    action?: string;
    uid: string;
    renames?: RenameHop[];
    attributes?: AttributeEntry[];
  };

  const collectFrom = (entries: RenameAwareEntry[]) => {
    entries
      .filter((entry) => entry.action === 'update' && Array.isArray(entry.renames))
      .forEach((entry) => {
        entry.renames!.forEach((hop) => {
          if (hop.oldName && hop.newName && hop.oldName !== hop.newName) {
            // The definition the field ends up with in this save, so the builder
            // can refuse hops that also change the field's storage (type,
            // relation target, component…). Intermediate hops of a chain have no
            // matching attribute and are checked when the chain completes.
            const newAttribute = entry.attributes?.find(
              (attribute) => attribute.action !== 'delete' && attribute.name === hop.newName
            )?.properties;

            renames.push({
              uid: entry.uid,
              oldName: hop.oldName,
              newName: hop.newName,
              newAttribute,
            });
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
  /** Set when the component's data table is renamed along with it. */
  oldCollectionName?: string;
  newCollectionName?: string;
}

interface EditedComponentIdentity {
  uid: string;
  /** `undefined` when the collection name is unchanged. */
  collectionName?: string;
}

/**
 * Derives the identity a component ends up with after an edit, exactly as the
 * schema builder's `editComponent` does, so the generated migration targets the
 * same uid / table the reload will write to disk.
 *
 * A component's uid is `<category>.<name>`. The category half follows the new
 * category. The name half follows the display name *only when the display name
 * changed*: components whose file name does not match their display name (e.g.
 * hand-edited schemas) must not be renamed by an unrelated edit. A display-name
 * change also gives the component the collection name a component created with
 * that name would get, so the old name is really free afterwards (CG-1001); a
 * category-only move keeps its collection name.
 */
export const getEditedComponentIdentity = (
  uid: string,
  { category, displayName }: { category?: string; displayName?: string },
  currentDisplayName?: string
): EditedComponentIdentity => {
  const [categoryUID, nameUID] = uid.split('.');

  const newCategory = category ? strings.nameToSlug(category) : categoryUID;
  const displayNameChanged =
    typeof displayName === 'string' && displayName !== '' && displayName !== currentDisplayName;
  const newName = displayNameChanged ? strings.nameToSlug(displayName) : nameUID;

  return {
    uid: `${newCategory}.${newName}`,
    collectionName: displayNameChanged
      ? getComponentCollectionName(newCategory, displayName)
      : undefined,
  };
};

export const getEditedComponentUid = (
  ...args: Parameters<typeof getEditedComponentIdentity>
): string => getEditedComponentIdentity(...args).uid;

/**
 * Collects component-level renames from the update-schema payload: a category or
 * display-name change moves the component to a new uid (see
 * `getEditedComponentIdentity`).
 */
const collectComponentRenames = (schema: CTBSchema): CollectedComponentRename[] => {
  type ComponentEntry = { action?: string; uid?: string; category?: string; displayName?: string };

  return (schema.components as unknown as ComponentEntry[])
    .filter((entry) => entry.action === 'update' && !!entry.uid)
    .map((entry) => {
      const current = (strapi.components as Record<string, any> | undefined)?.[entry.uid!];
      const { uid: newUid, collectionName } = getEditedComponentIdentity(
        entry.uid!,
        entry,
        current?.info?.displayName
      );

      const oldCollectionName = current?.collectionName as string | undefined;
      const tableRenamed =
        !!collectionName && !!oldCollectionName && collectionName !== oldCollectionName;

      return {
        oldUid: entry.uid!,
        newUid,
        ...(tableRenamed ? { oldCollectionName, newCollectionName: collectionName } : {}),
      };
    })
    .filter((rename) => rename.oldUid !== rename.newUid || !!rename.newCollectionName);
};

const describeUnsupportedReason = (reason: UnsupportedRename['reason']): string => {
  switch (reason) {
    case 'type-changed':
      return 'the field type, relation or component also changed';
    case 'unsupported-type':
      return 'polymorphic/morph relations are not supported';
    case 'attribute-not-found':
      return 'the field is not in the current schema';
    case 'model-not-found':
    default:
      return 'the type is not in the current schema';
  }
};

/**
 * Generates a single data-preserving rename migration for the accepted renames
 * in this save. Must run before the server reloads, while `strapi.db.metadata`
 * still reflects the old (pre-rename) schema.
 */
const generateRenameMigrations = async (schema: CTBSchema): Promise<void> => {
  // In prompt modes the admin strips refused renames before sending the payload.
  if (getAttributeRenameMigrationMode() === 'never') {
    return;
  }

  const renames = collectRenames(schema);
  const componentRenames = collectComponentRenames(schema);
  if (renames.length === 0 && componentRenames.length === 0) {
    return;
  }

  const migrationBuilder = createMigrationBuilder({ strapi });

  for (const { uid, oldName, newName, newAttribute } of renames) {
    migrationBuilder.addRenameAttribute(uid, { oldName, newName, newAttribute });
  }

  for (const rename of componentRenames) {
    migrationBuilder.addRenameComponent(rename);
  }

  const unsupported = migrationBuilder.getUnsupported();
  if (unsupported.length > 0) {
    const fields = unsupported
      .map((u) => `${u.uid}.${u.oldName} (${describeUnsupportedReason(u.reason)})`)
      .join(', ');
    strapi.log.warn(
      `[content-type-builder] Could not generate a rename migration for ${unsupported.length} field(s): ${fields}. Data in these fields may not be preserved.`
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
  const { ApplicationError } = errors;

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

export interface RenameComponentOptions {
  /** New category; the component moves to `<category>.<name>`. */
  category?: string;
  /** New display name; the component moves to `<category>.<slug(displayName)>`. */
  displayName?: string;
}

/**
 * Moves a component to a new category and/or display name (either of which
 * changes its uid `<category>.<name>`) and generates the migration that
 * preserves embedded data, in one step. Used by `strapi rename:component`.
 *
 * Like `renameAttribute`, it reuses the regular `updateSchema` path so the
 * component rename is resolved by the same `generateRenameMigrations` →
 * `createMigrationBuilder` flow the admin uses (which migrates the
 * `component_type` value in every `*_cmps` link table referencing the component).
 */
export const renameComponent = async (
  uid: string,
  options: string | RenameComponentOptions
): Promise<void> => {
  const { ApplicationError } = errors;

  const { category: newCategory, displayName: newDisplayName } =
    typeof options === 'string' ? { category: options, displayName: undefined } : options;

  if (!newCategory && !newDisplayName) {
    throw new ApplicationError('A new category or a new display name is required');
  }

  const component = (strapi.components as Record<string, any>)[uid];

  if (!component) {
    throw new ApplicationError(`No component found for uid "${uid}"`);
  }

  const { uid: newUid } = getEditedComponentIdentity(
    uid,
    { category: newCategory, displayName: newDisplayName },
    component.info?.displayName
  );

  if (newUid === uid) {
    throw new ApplicationError(
      `Component "${uid}" already has this category and display name; nothing to rename`
    );
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
        category: newCategory ?? component.category,
        displayName: newDisplayName ?? component.info?.displayName,
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
  const { getVisibleAttributes } = contentTypesUtils;

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
      renameMigrations: {
        attributes: getAttributeRenameMigrationMode(),
      },
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
        // A display-name change moves the component to a new uid / collection
        // name; `generateRenameMigrations` below emits the matching migration.
        followDisplayName: true,
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

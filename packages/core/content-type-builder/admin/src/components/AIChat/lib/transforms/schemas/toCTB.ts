import isEqual from 'lodash/isEqual';
import omit from 'lodash/omit';
import pluralize from 'pluralize';

import { applyPrivateSearchDefault } from '../../../../../utils/applyPrivateSearchDefault';

import type { ContentType, Component, AnyAttribute, RenameHop } from '../../../../../types';
import type { Schema, SchemaAttribute } from '../../types/schema';
import type { Struct, UID } from '@strapi/types';

const RENAME_METADATA_KEYS = ['previousName', 'renamedFrom', 'action'] as const;

const collectExplicitAttributeRenames = (
  attributes: Schema['attributes']
): { renames: RenameHop[]; attributes: Schema['attributes'] } => {
  const renames: RenameHop[] = [];
  const sanitizedAttributes = { ...attributes };

  Object.entries(attributes).forEach(([newName, rawAttr]) => {
    if (!rawAttr || typeof rawAttr !== 'object') {
      return;
    }

    const previousName = rawAttr.previousName ?? rawAttr.renamedFrom;
    if (typeof previousName !== 'string' || !previousName || previousName === newName) {
      return;
    }

    renames.push({ oldName: previousName, newName });
    sanitizedAttributes[newName] = omit(rawAttr, RENAME_METADATA_KEYS) as SchemaAttribute;
  });

  return { renames, attributes: sanitizedAttributes };
};

/**
 * A rename can only preserve data when the field keeps its storage: same type,
 * and for relations the same kind and target, for components the same component
 * and repeatable flag. Anything else must go through the regular remove + add
 * path (renaming the column and altering its type in place can fail at startup),
 * so such hops are dropped and the field is treated as removed + added.
 */
const isStorageCompatibleRename = (
  oldAttribute: AnyAttribute | undefined,
  newAttribute: SchemaAttribute | undefined
): boolean => {
  if (!oldAttribute || !newAttribute) {
    return true;
  }

  const previous = oldAttribute as Record<string, unknown>;
  const next = newAttribute as Record<string, unknown>;

  if (previous.type !== next.type) {
    return false;
  }

  if (next.type === 'relation') {
    return previous.relation === next.relation && previous.target === next.target;
  }

  if (next.type === 'component') {
    return (
      previous.component === next.component &&
      Boolean(previous.repeatable) === Boolean(next.repeatable)
    );
  }

  return true;
};

const dedupeRenames = (renames: RenameHop[]): RenameHop[] => {
  const seen = new Set<string>();

  return renames.filter((hop) => {
    const key = `${hop.oldName}->${hop.newName}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const applyExplicitRenames = (
  processedAttributes: AnyAttribute[],
  removedAttributes: AnyAttribute[],
  explicitRenames: RenameHop[]
): { processedAttributes: AnyAttribute[]; removedAttributes: AnyAttribute[] } => {
  if (explicitRenames.length === 0) {
    return { processedAttributes, removedAttributes };
  }

  const consumedRemoved = new Set(
    explicitRenames.map((hop) => hop.oldName).filter((oldName) => oldName)
  );

  explicitRenames.forEach((hop) => {
    const newAttr = processedAttributes.find((attr) => attr.name === hop.newName);
    if (newAttr && newAttr.status === 'NEW') {
      newAttr.status = 'CHANGED';
    }
  });

  return {
    processedAttributes,
    removedAttributes: removedAttributes.filter((attr) => !consumedRemoved.has(attr.name)),
  };
};

const isPluginContentTypeUid = (uid: string) => uid.startsWith('plugin::');

const isContentTypeKind = (kind: Schema['kind']): kind is Struct.ContentTypeKind => {
  return kind === 'collectionType' || kind === 'singleType';
};

/**
 * Plugin / extension content-types use server-derived identity (globalId, collectionName, …).
 * The AI chat uses a simplified shape that would otherwise overwrite those fields incorrectly.
 */
const isPluginContentType = (schema: Schema, oldSchema?: ContentType | Component): boolean => {
  if (schema.plugin || isPluginContentTypeUid(schema.uid)) {
    return true;
  }
  if (oldSchema && 'modelType' in oldSchema && oldSchema.modelType === 'contentType') {
    const ct = oldSchema as ContentType;
    return Boolean(ct.plugin) || isPluginContentTypeUid(String(ct.uid));
  }
  return false;
};

const ACTION_TO_STATUS: Record<Schema['action'], ContentType['status']> = {
  create: 'NEW',
  remove: 'REMOVED',
  update: 'CHANGED',
};

/**
 * Creates a new attribute with the specified status
 */
const createAttributeWithStatus = (
  name: string,
  attributeData: SchemaAttribute | AnyAttribute,
  status: AnyAttribute['status']
): AnyAttribute =>
  ({
    ...applyPrivateSearchDefault(attributeData),
    name,
    status,
  }) as AnyAttribute;

/**
 * Determines the status of an attribute by comparing new and old versions
 */
const determineAttributeStatus = (
  newAttr: Record<string, unknown>,
  oldAttr?: AnyAttribute,
  oldSchema?: ContentType | Component
): AnyAttribute['status'] => {
  if (!oldAttr) {
    return 'NEW';
  }

  // If the schema was already new, don't mark attributes as changed, keep them as new.
  if (oldSchema?.status === 'NEW') {
    return 'NEW';
  }

  // Compare attributes without the status field to determine if they've changed
  const newAttrWithoutStatus = omit(newAttr, ['status']);
  const oldAttrWithoutStatus = omit(oldAttr, ['status']);

  if (!isEqual(newAttrWithoutStatus, oldAttrWithoutStatus)) {
    return 'CHANGED';
  }

  // If unchanged, keep the previous status
  return oldAttr.status;
};

/**
 * Determines the status of a schema by comparing action and checking if oldSchema exists
 */
const transformStatusFromChatToCTB = (
  schema: Schema,
  oldSchema?: ContentType | Component
): ContentType['status'] => {
  // If schema has an action, use the mapped status
  if (schema.action) {
    return ACTION_TO_STATUS[schema.action];
  }

  // If oldSchema doesn't exist, it's a new schema
  if (!oldSchema) {
    return 'NEW';
  }

  // If no action is specified and oldSchema exists, keep the existing status
  return oldSchema.status;
};

type TransformAttributesResult = {
  attributes: AnyAttribute[];
  renames: RenameHop[];
};

/**
 * Transform attributes from Chat format to CTB format while collecting rename metadata.
 * Also performs a diff to determine the status of each attribute. Renames are only
 * taken from explicit metadata the AI provides (`previousName` / `renamedFrom`, or a
 * top-level `renames` array), never inferred from a remove/add diff, so data is never
 * moved unless a rename was explicitly requested.
 */
const transformAttributesAndRenamesFromChatToCTB = (
  { action, attributes: rawAttributes, renames: schemaRenames = [] }: Schema,
  oldSchema?: ContentType | Component
): TransformAttributesResult => {
  const { attributes, renames: explicitAttributeRenames } =
    collectExplicitAttributeRenames(rawAttributes);

  // If it's a new schema or no oldAttributes provided, all attributes are NEW
  if (action === 'create' || !oldSchema) {
    return {
      attributes: Object.entries(attributes).map(([name, attribute]) =>
        createAttributeWithStatus(name, attribute, 'NEW')
      ),
      renames: [],
    };
  }

  // Convert old attributes array to a lookup map for faster access
  const oldAttributesMap = oldSchema.attributes.reduce(
    (acc, attr) => ({ ...acc, [attr.name]: attr }),
    {} as Record<string, AnyAttribute>
  );

  // Only renames that keep the field's storage can be replayed as a migration;
  // the rest fall back to remove + add.
  const compatibleRenames = [...schemaRenames, ...explicitAttributeRenames].filter((hop) =>
    isStorageCompatibleRename(oldAttributesMap[hop.oldName], attributes[hop.newName])
  );
  const compatibleAttributeRenames = explicitAttributeRenames.filter((hop) =>
    compatibleRenames.includes(hop)
  );

  const explicitOldNames = new Set(compatibleAttributeRenames.map((hop) => hop.oldName));

  // Process current attributes (new and changed)
  const processedAttributes = Object.entries(attributes).map(([name, attr]) => {
    const oldAttr = oldAttributesMap[name];
    const explicitRename = compatibleAttributeRenames.find((hop) => hop.newName === name);
    const status = explicitRename
      ? oldSchema.status === 'NEW'
        ? 'NEW'
        : 'CHANGED'
      : determineAttributeStatus({ ...attr, name }, oldAttr, oldSchema);

    return createAttributeWithStatus(name, attr, status);
  });

  // No need to mark removed attributes if the old schema is new, just remove it from the list
  // TODO: Else a validation error occurs on the backend side.
  if (oldSchema?.status === 'NEW') {
    return { attributes: processedAttributes, renames: [] };
  }

  // Find removed attributes (exist in old but not in new)
  const removedAttributes = Object.entries(oldAttributesMap)
    .filter(([name]) => !attributes[name] && !explicitOldNames.has(name))
    .map(([name, oldAttr]) => createAttributeWithStatus(name, oldAttr, 'REMOVED'));

  const reconciled = applyExplicitRenames(
    processedAttributes,
    removedAttributes,
    compatibleRenames
  );

  // Combine both sets of attributes
  const combinedAttributes = [...reconciled.processedAttributes, ...reconciled.removedAttributes];

  return {
    attributes: combinedAttributes,
    renames: dedupeRenames(compatibleRenames),
  };
};

/**
 * Transform attributes from Chat format to CTB format.
 *
 * Keep the existing array return type for callers that only need attributes.
 */
export const transformAttributesFromChatToCTB = (
  schema: Schema,
  oldSchema?: ContentType | Component
): AnyAttribute[] => transformAttributesAndRenamesFromChatToCTB(schema, oldSchema).attributes;

/**
 * Transform schema format
 *  AI chat -> CTB
 *
 * The AI chat returns a simplified format, and this layer transforms it to be compatible with the CTB reducer.
 *
 * We need to keep track of which changes have been made
 */
export const transformChatToCTB = (
  schema: Schema,
  oldSchema?: ContentType | Component
): ContentType | Component => {
  const singularName = pluralize.singular(schema.name).toLowerCase().replace(/ /g, '-');
  const pluralName = pluralize.plural(schema.name).toLowerCase().replace(/ /g, '-');
  const { attributes, renames } = transformAttributesAndRenamesFromChatToCTB(schema, oldSchema);
  const renamePayload = renames.length > 0 ? { renames } : {};

  if (schema.modelType === 'component') {
    return {
      category: schema.category || 'default',
      modelName: singularName,
      attributes,
      ...renamePayload,
      info: {
        displayName: schema.name,
        description: schema.description,
        // TODO
        // icon: schema.icon,
      },
      modelType: schema.modelType,
      uid: schema.uid as UID.Component,
      collectionName: pluralName,
      status: transformStatusFromChatToCTB(schema, oldSchema),
      globalId: singularName,
    } satisfies Component;
  }

  const previousContentType = oldSchema?.modelType === 'contentType' ? oldSchema : undefined;
  const kind = isContentTypeKind(schema.kind) ? schema.kind : 'collectionType';

  const contentTypeBase = {
    uid: schema.uid as UID.ContentType,
    modelType: 'contentType',
    modelName: singularName,
    kind,
    info: {
      displayName: schema.name.charAt(0).toUpperCase() + schema.name.slice(1),
      // Always keep the old by default
      singularName: previousContentType?.info.singularName ?? singularName,
      // Always keep the old by default
      pluralName: previousContentType?.info.pluralName ?? pluralName,
    },
    collectionName: pluralName,
    attributes,
    ...renamePayload,
    options: {
      draftAndPublish: schema.options?.draftAndPublish ?? true,
    },
    pluginOptions: {
      i18n: {
        localized: schema.options?.localized ?? false,
      },
    },
    visible: true,
    status: transformStatusFromChatToCTB(schema, oldSchema),
    globalId: singularName,
    restrictRelationsTo: null, // TODO: not sure what this is about
  } satisfies ContentType;

  if (
    isPluginContentType(schema, oldSchema) &&
    oldSchema &&
    oldSchema.modelType === 'contentType'
  ) {
    const prev = oldSchema as ContentType;
    return {
      ...contentTypeBase,
      plugin: prev.plugin ?? schema.plugin,
      globalId: prev.globalId,
      modelName: prev.modelName,
      collectionName: prev.collectionName,
      info: {
        ...contentTypeBase.info,
        singularName: prev.info.singularName,
        pluralName: prev.info.pluralName,
      },
      options: {
        ...prev.options,
        ...contentTypeBase.options,
        draftAndPublish: schema.options?.draftAndPublish ?? prev.options?.draftAndPublish ?? true,
      },
      pluginOptions: {
        ...prev.pluginOptions,
        ...contentTypeBase.pluginOptions,
        i18n: {
          ...(prev.pluginOptions?.i18n as Record<string, unknown> | undefined),
          ...(contentTypeBase.pluginOptions?.i18n as Record<string, unknown> | undefined),
          localized:
            schema.options?.localized ??
            (prev.pluginOptions?.i18n as { localized?: boolean } | undefined)?.localized ??
            false,
        },
      },
      visible: prev.visible,
      restrictRelationsTo: prev.restrictRelationsTo,
    } satisfies ContentType;
  }

  if (isPluginContentType(schema, oldSchema) && schema.plugin) {
    return {
      ...contentTypeBase,
      plugin: schema.plugin,
    } satisfies ContentType;
  }

  return contentTypeBase;
};

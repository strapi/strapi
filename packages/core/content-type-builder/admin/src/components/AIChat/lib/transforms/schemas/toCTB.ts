// eslint-disable-next-line @typescript-eslint/ban-ts-comment
import isEqual from 'lodash/isEqual';
import omit from 'lodash/omit';
import pluralize from 'pluralize';

import { Schema } from '../../types/schema';

import type { ContentType, Component, AnyAttribute, RenameHop } from '../../../../../types';

const RENAME_METADATA_KEYS = ['previousName', 'renamedFrom', 'action'] as const;

const attributePropertiesForRenameMatch = (attr: Record<string, any>) =>
  omit(attr, ['name', 'status', ...RENAME_METADATA_KEYS]);

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
    sanitizedAttributes[newName] = omit(rawAttr, RENAME_METADATA_KEYS);
  });

  return { renames, attributes: sanitizedAttributes };
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

const inferRenamesFromAttributeDiff = (
  processedAttributes: AnyAttribute[],
  removedAttributes: AnyAttribute[]
): { attributes: AnyAttribute[]; renames: RenameHop[] } => {
  const renames: RenameHop[] = [];
  const consumedRemoved = new Set<string>();

  const unmatchedNewAttributes = processedAttributes.filter((attr) => attr.status === 'NEW');
  const unmatchedRemovedAttributes = removedAttributes.filter((attr) => attr.status === 'REMOVED');

  unmatchedNewAttributes.forEach((newAttr) => {
    const candidates = unmatchedRemovedAttributes.filter(
      (removedAttr) =>
        !consumedRemoved.has(removedAttr.name) &&
        removedAttr.type === newAttr.type &&
        isEqual(
          attributePropertiesForRenameMatch(newAttr),
          attributePropertiesForRenameMatch(removedAttr)
        )
    );

    if (candidates.length !== 1) {
      return;
    }

    const [removedAttr] = candidates;
    renames.push({ oldName: removedAttr.name, newName: newAttr.name });
    consumedRemoved.add(removedAttr.name);
    newAttr.status = 'CHANGED';
  });

  const attributes = [
    ...processedAttributes,
    ...removedAttributes.filter((attr) => !consumedRemoved.has(attr.name)),
  ];

  return { attributes, renames };
};

const isPluginContentTypeUid = (uid: string) => uid.startsWith('plugin::');

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
  attributeData: Record<string, any>,
  status: AnyAttribute['status']
): AnyAttribute =>
  ({
    ...attributeData,
    name,
    status,
  }) as AnyAttribute;

/**
 * Determines the status of an attribute by comparing new and old versions
 */
const determineAttributeStatus = (
  newAttr: Record<string, any>,
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
 * Transform attributes from Chat format to CTB format.
 * Also performs a diff to determine the status of each attribute and infers
 * rename hops so AI-driven updates can use the same migration path as manual
 * edits in the Content-Type Builder.
 */
export const transformAttributesFromChatToCTB = (
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

  const explicitOldNames = new Set(explicitAttributeRenames.map((hop) => hop.oldName));

  // Process current attributes (new and changed)
  const processedAttributes = Object.entries(attributes).map(([name, attr]) => {
    const oldAttr = oldAttributesMap[name];
    const explicitRename = explicitAttributeRenames.find((hop) => hop.newName === name);
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

  const explicitRenames = [...schemaRenames, ...explicitAttributeRenames];
  const reconciled = applyExplicitRenames(processedAttributes, removedAttributes, explicitRenames);

  const inferred = inferRenamesFromAttributeDiff(
    reconciled.processedAttributes,
    reconciled.removedAttributes
  );

  const renames = dedupeRenames([...explicitRenames, ...inferred.renames]);

  return {
    attributes: inferred.attributes,
    renames,
  };
};

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
  const { attributes, renames } = transformAttributesFromChatToCTB(schema, oldSchema);
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
      uid: schema.uid as any,
      collectionName: pluralName,
      status: transformStatusFromChatToCTB(schema, oldSchema),
      globalId: singularName,
    } satisfies Component;
  }

  const contentTypeBase = {
    uid: schema.uid as any,
    modelType: schema.modelType,
    modelName: singularName,
    kind: schema.kind!,
    info: {
      displayName: schema.name.charAt(0).toUpperCase() + schema.name.slice(1),
      // Always keep the old by default
      // @ts-expect-error - not in types
      singularName: oldSchema?.info?.singularName || singularName,
      // Always keep the old by default
      // @ts-expect-error - not in types
      pluralName: oldSchema?.info?.pluralName || pluralName,
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
          ...((prev.pluginOptions?.i18n as Record<string, unknown> | undefined) ?? {}),
          ...((contentTypeBase.pluginOptions?.i18n as Record<string, unknown> | undefined) ?? {}),
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

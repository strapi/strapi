/**
 * Turns the engine's tables into Strapi content types.
 *
 * Ported from the schema transformer of `@strapi-community/plugin-better-auth` (MIT,
 * Copyright (c) Boaz Poolman / strapi-community), which generates content types from Better Auth's
 * tables through the Content-Type Builder. This version differs on purpose:
 *
 * - It is a pure function, run at `register()`: nothing is written to disk and the Content-Type
 *   Builder is not involved.
 * - Ids are Strapi `documentId`s. There is no `id` attribute, and a reference to a user's `id` is a
 *   plain string column.
 * - The indexes are declared, so a session lookup is not a table scan.
 * - Secrets are `private` attributes, and the admin plugin's `role` is `writable: false` as well.
 * - Tables are named `eu_*`, and the user type is locked (design sections 7 and 7.1).
 */
import type { Struct } from '@strapi/types';

import { GRAPHQL_TYPE_NAMES, ROLE_UID } from '../../../constants';
import type { EngineField, EngineTable } from '../../types';
import { pluralNameOf, singularNameOf } from '../model-names';
import { isHiddenField, isPrivateField, isReadOnlyField } from './private-fields';

/** Prefix of every table the plugin owns. */
const TABLE_PREFIX = 'eu_';

/** The one generated type that is managed in the Content Manager. */
const USER_TYPE = 'user';

/**
 * Attributes Strapi adds to every content type itself. Generating one here would collide with it.
 * (Better Auth's `createdAt` and `updatedAt` are the same columns as Strapi's.)
 */
const STRAPI_MANAGED_ATTRIBUTES = new Set([
  'id',
  'documentId',
  'createdAt',
  'updatedAt',
  'publishedAt',
  'createdBy',
  'updatedBy',
  'locale',
  'localizations',
]);

/**
 * Strings that are short in practice and not indexed, so they are stored as varchar rather than
 * long text. Indexed, unique, referencing and `sortable` fields are always varchar (MySQL cannot
 * index a text column); everything else is long text, because the value is unbounded (a user agent,
 * an OAuth token, a key).
 */
const SHORT_STRING_FIELDS = new Set([
  'ipAddress',
  'role',
  'impersonatedBy',
  'displayUsername',
  'preferredLocale',
]);

/**
 * Lookups Better Auth does not declare but the plugin depends on, by singular name. Merged into the
 * indexes the engine's own tables declare; a unique index replaces a plain one on the same columns.
 */
const EXTRA_INDEXES: Readonly<
  Record<string, ReadonlyArray<{ fields: string[]; unique: boolean }>>
> = {
  // sign-in by provider, and the guard against linking the same external account twice
  account: [{ fields: ['providerId', 'accountId'], unique: true }],
  // a user has at most one two-factor record
  'two-factor': [{ fields: ['userId'], unique: true }],
};

/**
 * What `toContentTypes` needs from Strapi's database layer, which is `strapi.db.metadata`.
 *
 * Both are used so the names here are the ones Strapi would derive itself: `naming.columnName`
 * is how it turns an attribute name into a column, and `identifiers` is how it names (and, when too
 * long, shortens) indexes. Neither is a public export of `@strapi/database` at runtime other than
 * through `strapi.db.metadata`.
 */
export interface DbNaming {
  identifiers: {
    getIndexName(names: string | string[]): string;
    getUniqueIndexName(names: string | string[]): string;
  };
  naming: {
    columnName(attributeName: string): string;
  };
}

interface PlannedIndex {
  /** Attribute names, in index order. */
  attributes: string[];
  unique: boolean;
}

const toTitleCase = (kebab: string): string => {
  return kebab
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/** The attribute a field is stored under: the engine's configured name, or its key. */
const attributeNameOf = (key: string, field: EngineField): string => field.fieldName ?? key;

const isIndexed = (field: EngineField): boolean => {
  return Boolean(field.unique || field.index || field.references || field.sortable);
};

const planIndexes = (singularName: string, table: EngineTable): PlannedIndex[] => {
  const attributeOf = (key: string) => {
    const field = table.fields[key];
    return field ? attributeNameOf(key, field) : key;
  };

  const planned: PlannedIndex[] = [];

  for (const [key, field] of Object.entries(table.fields)) {
    const attribute = attributeOf(key);

    if (STRAPI_MANAGED_ATTRIBUTES.has(attribute)) {
      continue;
    }

    if (field.unique) {
      planned.push({ attributes: [attribute], unique: true });
    } else if (field.index || field.references) {
      // A foreign key is a plain column (not a Strapi relation, which would add a join table to
      // every session lookup), so the index is what makes looking up or deleting by user cheap.
      planned.push({ attributes: [attribute], unique: false });
    }
  }

  for (const index of table.indexes ?? []) {
    planned.push({ attributes: index.fields.map(attributeOf), unique: index.unique === true });
  }

  for (const index of EXTRA_INDEXES[singularName] ?? []) {
    planned.push({ attributes: index.fields.map(attributeOf), unique: index.unique });
  }

  // One index per column list, unique winning, in the order first seen.
  const bySignature = new Map<string, PlannedIndex>();

  for (const index of planned) {
    const signature = index.attributes.join('\0');
    const existing = bySignature.get(signature);

    if (!existing) {
      bySignature.set(signature, index);
    } else if (index.unique) {
      existing.unique = true;
    }
  }

  return [...bySignature.values()];
};

const toStringType = (
  singularName: string,
  attribute: string,
  field: EngineField,
  indexedAttributes: Set<string>
): string => {
  if (singularName === USER_TYPE && attribute === 'email') {
    return 'email';
  }

  const isShort =
    isIndexed(field) || indexedAttributes.has(attribute) || SHORT_STRING_FIELDS.has(attribute);

  return isShort ? 'string' : 'text';
};

const toAttribute = (
  singularName: string,
  key: string,
  field: EngineField,
  indexedAttributes: Set<string>
): Record<string, unknown> => {
  const attribute = attributeNameOf(key, field);

  let type: string;
  if (Array.isArray(field.type)) {
    type = 'enumeration';
  } else {
    switch (field.type) {
      case 'string':
        type = toStringType(singularName, attribute, field, indexedAttributes);
        break;
      case 'number':
        type = field.bigint ? 'biginteger' : 'integer';
        break;
      case 'boolean':
        type = 'boolean';
        break;
      case 'date':
        type = 'datetime';
        break;
      default:
        type = 'json'; // json, string[], number[]
    }
  }

  // A reference to an `id` holds the target's documentId, which is a string
  if (field.references?.field === 'id') {
    type = 'string';
  }

  const result: Record<string, unknown> = { type, configurable: false };

  if (Array.isArray(field.type)) result.enum = [...field.type];
  if (field.required !== false) result.required = true;
  if (isPrivateField(singularName, key, attribute, field)) result.private = true;
  if (isHiddenField(singularName, key, attribute)) result.visible = false;
  if (isReadOnlyField(singularName, key, attribute)) result.writable = false;

  if (
    field.defaultValue !== undefined &&
    field.defaultValue !== null &&
    typeof field.defaultValue !== 'function'
  ) {
    result.default = field.defaultValue;
  }

  return result;
};

const toPluginOptions = (singularName: string): Record<string, unknown> => {
  if (singularName === USER_TYPE) {
    return {
      // Locked, like admin::user: hidden from the Content-Type Builder, and the only relations
      // that may point at it are one-way ones, so project changes never rewrite its schema.
      'content-type-builder': { visible: false, restrictRelationsTo: ['oneWay', 'manyWay'] },
      // End users are managed in the Content Manager.
      'content-manager': { visible: true },
      i18n: { localized: false },
      // The GraphQL types are `EndUser`, `endUsers`, `createEndUser`, ... and not the type's
      // `EndUsersUser`: the user is the plugin's one public type (see `GRAPHQL_TYPE_NAMES`)
      graphql: { typeName: GRAPHQL_TYPE_NAMES.user },
    };
  }

  return {
    'content-type-builder': { visible: false },
    'content-manager': { visible: false },
    i18n: { localized: false },
  };
};

const toContentType = (table: EngineTable, db: DbNaming): Struct.ContentTypeSchema => {
  const singularName = singularNameOf(table.name);
  const pluralName = pluralNameOf(singularName);
  // The table is named after the engine's stable key, never after a configured model name, so a
  // setting cannot move a table out from under its content type.
  const collectionName = `${TABLE_PREFIX}${pluralName.replace(/-/g, '_')}`;

  const plannedIndexes = planIndexes(singularName, table);
  const indexedAttributes = new Set(plannedIndexes.flatMap((index) => index.attributes));

  const attributes: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(table.fields)) {
    const attribute = attributeNameOf(key, field);

    if (STRAPI_MANAGED_ATTRIBUTES.has(attribute)) {
      continue;
    }

    attributes[attribute] = toAttribute(singularName, key, field, indexedAttributes);
  }

  const indexes = plannedIndexes.map((index) => {
    const columns = index.attributes.map((attribute) => db.naming.columnName(attribute));

    return index.unique
      ? {
          name: db.identifiers.getUniqueIndexName([collectionName, ...columns]),
          columns,
          type: 'unique',
        }
      : { name: db.identifiers.getIndexName([collectionName, ...columns]), columns };
  });

  if (singularName === USER_TYPE) {
    // The plugin's own attribute, not Better Auth's and not a project's (the type is locked). A
    // one-way relation (`manyToMany` with no `inversedBy`): the role has no `users`, so the user
    // owns the link table (`eu_users_roles_lnk`) and no other type can rewrite this schema. A role's
    // users are counted on that table.
    attributes.roles = {
      type: 'relation',
      relation: 'manyToMany',
      target: ROLE_UID,
      configurable: false,
    };
  }

  // The plugin loader adds `plugin`, `globalId`, and (through the registry) `uid`, `modelType` and
  // `modelName`, exactly as for a schema.json, so they are not set here.
  return {
    kind: 'collectionType',
    collectionName,
    info: {
      singularName,
      pluralName,
      displayName: toTitleCase(singularName),
    },
    options: { draftAndPublish: false },
    pluginOptions: toPluginOptions(singularName),
    attributes,
    indexes,
  } as unknown as Struct.ContentTypeSchema;
};

/**
 * Generates one content type per table the engine wants created, keyed by singular name
 * (`user`, `session`, `two-factor`, ...), which is also what the uid
 * `plugin::end-users.<key>` is built from.
 *
 * `db` defaults to `strapi.db.metadata`; it is a parameter so the function stays a pure one.
 */
export const toContentTypes = (
  tables: EngineTable[],
  db: DbNaming = strapi.db.metadata
): Record<string, { schema: Struct.ContentTypeSchema }> => {
  const contentTypes: Record<string, { schema: Struct.ContentTypeSchema }> = {};

  for (const table of tables) {
    if (table.disableMigrations) continue;

    const schema = toContentType(table, db);
    contentTypes[schema.info.singularName] = { schema };
  }

  return contentTypes;
};

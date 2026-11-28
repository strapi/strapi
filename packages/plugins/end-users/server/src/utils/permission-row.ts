import { errors } from '@strapi/utils';

import type { PermissionRow } from '../../../shared/contracts/permissions';
import type { PermissionDiff, PermissionProblem } from '../../../shared/contracts/roles';
import { isPlain, isPlainObject } from './is-plain';

/**
 * What a role's permission is, as the plugin stores it in `eu_permissions` and as an export file
 * carries it, and a diff of one role's permissions: the contracts the role editor shares
 * (`shared/contracts`). Re-exported so the server imports them from here.
 */
export type { PermissionDiff, PermissionRow };

type Plain = Record<string, unknown>;

const refuse = (message: string): never => {
  throw new errors.ValidationError(message);
};

/**
 * The size of a `string` attribute's column (varchar(255) on Postgres and MySQL). The permission
 * table is written through the database layer, which does not check a length, so a longer value
 * would come back from the database as a 500 rather than from here as a 400.
 */
export const MAX_STRING_LENGTH = 255;

/**
 * Size bounds, checked before any other check of what was sent: permissions a role
 * has, fields a permission lists, conditions it holds, and the JSON size of one condition's params.
 */
export const MAX_PERMISSIONS_PER_ROLE = 5_000;
export const MAX_FIELDS_PER_ROW = 1_000;
export const MAX_CONDITIONS_PER_ROW = 20;
export const MAX_CONDITION_PARAMS_BYTES = 4_096;

/** A limit as a refusal names it: 5,000 */
export const formatLimit = (limit: number) => limit.toLocaleString('en-US');

const refuseTooLong = (what: string): never =>
  refuse(`${what} is at most ${MAX_STRING_LENGTH} characters`);

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const toAction = (value: unknown): string => {
  if (typeof value !== 'string' || value.trim() === '') {
    return refuse('A permission needs an action: a non-empty string');
  }

  return value.length > MAX_STRING_LENGTH ? refuseTooLong('The action of a permission') : value;
};

const toSubject = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    return refuse('A permission subject is a string or null');
  }

  return value.length > MAX_STRING_LENGTH ? refuseTooLong('The subject of a permission') : value;
};

/** Keys that mean something to JavaScript itself, and to nobody who writes condition params. */
const UNSAFE_KEYS: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype']);

/** How deep the params of a condition may nest. */
const MAX_PARAMS_DEPTH = 16;

/**
 * A copy of a JSON value, made of new objects and arrays, without the keys that mean something to
 * JavaScript itself (`__proto__`, `constructor`, `prototype`). Anything that is not JSON is refused.
 */
const copyJson = (value: unknown, depth = 0): unknown => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (depth >= MAX_PARAMS_DEPTH) {
    return refuse(`The params of a condition nest at most ${MAX_PARAMS_DEPTH} levels deep`);
  }

  if (Array.isArray(value)) {
    return value.map((item) => copyJson(item, depth + 1));
  }

  if (isPlainObject(value)) {
    const copy: Plain = {};

    for (const [key, item] of Object.entries(value)) {
      if (!UNSAFE_KEYS.has(key) && item !== undefined) {
        copy[key] = copyJson(item, depth + 1);
      }
    }

    return copy;
  }

  return refuse('The params of a condition are JSON values');
};

/**
 * The field rules of a permission, rebuilt from the three keys the plugin knows, so another key in
 * what was sent (an import file is how data from elsewhere gets in) is not stored.
 */
const toProperties = (value: unknown): PermissionRow['properties'] => {
  if (value === null || value === undefined) {
    return {};
  }

  if (!isPlain(value)) {
    return refuse('The properties of a permission are an object');
  }

  const { fields, locales, populateDepth } = value;

  if (Array.isArray(fields) && fields.length > MAX_FIELDS_PER_ROW) {
    refuse(
      `properties.fields of a permission lists at most ${formatLimit(MAX_FIELDS_PER_ROW)} fields`
    );
  }

  for (const [name, list] of [
    ['fields', fields],
    ['locales', locales],
  ] as const) {
    if (list !== undefined && list !== null && !isStringList(list)) {
      refuse(`properties.${name} of a permission is a list of strings or null`);
    }
  }

  if (populateDepth !== undefined && populateDepth !== null && typeof populateDepth !== 'number') {
    refuse('properties.populateDepth of a permission is a number or null');
  }

  // The engine reads no locale limit, so one that is saved would look like a restriction and
  // restrict nothing. Rows already stored with one still load: this runs on what is written
  if (locales !== undefined && locales !== null) {
    refuse(
      'properties.locales of a permission must be null: a locale limit is not enforced yet, so it cannot be saved'
    );
  }

  const properties: PermissionRow['properties'] = {};

  if (fields !== undefined) properties.fields = fields === null ? null : [...(fields as string[])];
  if (locales !== undefined) properties.locales = null;
  if (populateDepth !== undefined) properties.populateDepth = populateDepth as number | null;

  return properties;
};

/** The conditions of a permission, each rebuilt as `{ name, params }` and nothing else. */
const toConditions = (value: unknown): PermissionRow['conditions'] => {
  if (value === null || value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    return refuse('The conditions of a permission are a list');
  }

  if (value.length > MAX_CONDITIONS_PER_ROW) {
    refuse(`A permission has at most ${formatLimit(MAX_CONDITIONS_PER_ROW)} conditions`);
  }

  return value.map((condition) => {
    if (!isPlain(condition) || typeof condition.name !== 'string' || condition.name === '') {
      return refuse('A condition of a permission is an object with a name');
    }

    if (condition.params !== undefined && !isPlain(condition.params)) {
      return refuse('The params of a condition are an object');
    }

    const params =
      condition.params === undefined
        ? undefined
        : (copyJson(condition.params) as Record<string, unknown>);

    if (
      params !== undefined &&
      Buffer.byteLength(JSON.stringify(params)) > MAX_CONDITION_PARAMS_BYTES
    ) {
      refuse(
        `The params of a condition are at most ${formatLimit(MAX_CONDITION_PARAMS_BYTES)} bytes of JSON`
      );
    }

    return { name: condition.name, ...(params !== undefined && { params }) };
  });
};

/**
 * A permission row as it is stored: refuses what is not one, and gives what is left out its empty
 * value. The row is a new object; `properties` and `conditions` are the caller's own values.
 */
export const toPermissionRow = (value: unknown): PermissionRow => {
  if (!isPlain(value)) {
    return refuse('A permission is an object');
  }

  return {
    action: toAction(value.action),
    subject: toSubject(value.subject),
    properties: toProperties(value.properties),
    conditions: toConditions(value.conditions),
  };
};

const refuseTooManyPermissions = (): never =>
  refuse(`A role has at most ${formatLimit(MAX_PERMISSIONS_PER_ROLE)} permissions`);

/**
 * A list of permission rows as they are stored, `toPermissionRow` for each. A role has at most
 * `MAX_PERMISSIONS_PER_ROLE`: a longer list is refused before any row is read.
 */
export const toPermissionRows = (values: readonly unknown[]): PermissionRow[] => {
  if (values.length > MAX_PERMISSIONS_PER_ROLE) {
    return refuseTooManyPermissions();
  }

  return values.map(toPermissionRow);
};

/**
 * What a `documentId` is: Strapi's are lowercase letters and digits. Anything else is refused rather
 * than matched, because the database compares ids by its own collation (case-insensitively on MySQL),
 * so `ABC` could reach the row the code knows as `abc` without being the id the checks looked at.
 */
const CANONICAL_DOCUMENT_ID = /^[a-z0-9]{1,64}$/;

const isCanonicalDocumentId = (value: unknown): value is string =>
  typeof value === 'string' && CANONICAL_DOCUMENT_ID.test(value);

/**
 * The changes an update makes to a row: only what it was given, each part checked the way a whole
 * row is. A part that is `null` is refused where a row cannot be without it.
 */
export const toPermissionChanges = (
  value: unknown
): { documentId: string } & Partial<PermissionRow> => {
  if (!isPlain(value)) {
    return refuse('A permission change is an object');
  }

  if (typeof value.documentId !== 'string' || value.documentId === '') {
    return refuse('A permission change needs the documentId of the permission');
  }

  if (!isCanonicalDocumentId(value.documentId)) {
    return refuse(
      'The documentId of a permission is at most 64 lowercase letters and digits: a permission change names it as it is stored'
    );
  }

  const changes: { documentId: string } & Partial<PermissionRow> = { documentId: value.documentId };

  if (value.action !== undefined) changes.action = toAction(value.action);
  if (value.subject !== undefined) changes.subject = toSubject(value.subject);
  if (value.properties !== undefined) changes.properties = toProperties(value.properties);
  if (value.conditions !== undefined) changes.conditions = toConditions(value.conditions);

  return changes;
};

export const toDocumentIds = (value: unknown): string[] => {
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string' || id === '')) {
    return refuse('The permissions to delete are a list of documentIds');
  }

  if (!value.every(isCanonicalDocumentId)) {
    return refuse(
      'The permissions to delete are named by documentId: at most 64 lowercase letters and digits each, as they are stored'
    );
  }

  return value as string[];
};

const DIFF_KEYS = ['create', 'update', 'delete'] as const;

/**
 * A diff of a role's permissions: an object that has only `create`, `update` and `delete`, each a
 * list when it is there. Anything else is refused rather than ignored. A client that sends the
 * whole list of permissions (`{ permissions: [...] }`, the shape of the plugin this replaces) would
 * otherwise be told they were saved when nothing changed.
 */
export const toPermissionDiff = (value: unknown): PermissionDiff => {
  if (!isPlain(value)) {
    return refuse('The permissions of a role are changed by a diff: { create, update, delete }');
  }

  const unknown = Object.keys(value).filter(
    (key) => !(DIFF_KEYS as readonly string[]).includes(key)
  );

  if (unknown.length > 0) {
    refuse(`Unknown keys in the permissions diff: ${unknown.join(', ')}`);
  }

  for (const key of DIFF_KEYS) {
    const list = value[key];

    if (list !== undefined && !Array.isArray(list)) {
      refuse(`permissions.${key} is a list`);
    }

    // No part of a diff can be longer than a role's permissions
    if (Array.isArray(list) && list.length > MAX_PERMISSIONS_PER_ROLE) {
      refuse(
        `permissions.${key} lists more than the ${formatLimit(MAX_PERMISSIONS_PER_ROLE)} permissions a role may have`
      );
    }
  }

  return {
    create: (value.create ?? []) as PermissionDiff['create'],
    update: (value.update ?? []) as PermissionDiff['update'],
    delete: (value.delete ?? []) as PermissionDiff['delete'],
  };
};

/**
 * A diff as the writes use it: its shape and lengths checked (`toPermissionDiff`), each row to
 * create rebuilt as a stored row, each update as the changes it makes, and the ids to delete
 * checked.
 *
 * A documentId may be named once in `update`, and not in `delete` as well. The checks
 * (`role.update`) read each change over the stored row, on its own, while the writes apply the
 * changes in order, each over the previous: two changes to one row would store a row nobody
 * checked. A diff that does either is refused here, before any check or write.
 */
export const toStoredDiff = (value: unknown): PermissionDiff => {
  const diff = toPermissionDiff(value);

  const stored: PermissionDiff = {
    create: diff.create.map(toPermissionRow),
    update: diff.update.map(toPermissionChanges),
    delete: toDocumentIds(diff.delete),
  };

  const deleted = new Set(stored.delete);
  const updated = new Set<string>();

  for (const { documentId } of stored.update) {
    if (updated.has(documentId)) {
      refuse(`Permission ${documentId} is changed more than once in the permissions diff`);
    }

    if (deleted.has(documentId)) {
      refuse(`Permission ${documentId} is both changed and deleted in the permissions diff`);
    }

    updated.add(documentId);
  }

  return stored;
};

/**
 * The refusal of a row the import checks (`permission.findProblems`) found a problem with:
 * `Permission <n> (<action>): <reason>`, and the path a front end can point at in
 * `details.errors`: `['permissions', n, key]` for a list of rows, `['permissions', 'create' |
 * 'update', n, key]` for a row of a diff. `index` is the row's place in its list.
 */
export const permissionRefusal = (
  { index, action, key, reason }: Omit<PermissionProblem, 'documentId'>,
  part?: 'create' | 'update'
): errors.ValidationError => {
  const message = `Permission ${index} (${action}): ${reason}`;
  const path = part === undefined ? ['permissions', index, key] : ['permissions', part, index, key];

  return new errors.ValidationError(message, {
    errors: [{ path, message, name: 'ValidationError' }],
  });
};

/**
 * A role has one permission for an action on a subject: the same two twice is refused, naming
 * them. There is no database index behind this, because `subject` is null for what belongs to no
 * content type and a null is never equal to another in a unique index.
 *
 * Subjects are compared as the engine reads them: a row with no subject is on its
 * action's content type, `subjectOf(action)` (core's `strapi.contentAPI.permissions.subjectOf`),
 * so `(api::note.note.find, null)` and `(api::note.note.find, api::note.note)` are the same
 * permission. A row stored under another type than its action's stays a row of its own.
 */
export const refuseDuplicatePermissions = (
  rows: ReadonlyArray<{ action: string; subject: string | null }>,
  subjectOf: (action: string) => string | null
): void => {
  const seen = new Set<string>();

  for (const { action, subject } of rows) {
    const derived = subject ?? subjectOf(action) ?? null;
    const key = JSON.stringify([action, derived]);

    if (seen.has(key)) {
      refuse(
        `A role has a permission for an action on a subject only once, and "${action}" on ` +
          `${derived === null ? 'no subject' : `"${derived}"`} is there twice`
      );
    }

    seen.add(key);
  }
};

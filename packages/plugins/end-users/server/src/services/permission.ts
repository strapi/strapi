import { errors } from '@strapi/utils';
import type { Core, Modules, UID } from '@strapi/types';

import type { FieldAccepts } from '../../../shared/builder/types';

import { isParamNeeded } from '../../../shared/conditions/params';
import type { ConditionRef } from '../../../shared/contracts/permissions';
import type { PermissionProblem } from '../../../shared/contracts/roles';
import { relationsTo } from '../conditions';
import { PERMISSION_UID, PLUGIN_ID, ROLE_UID } from '../constants';
import { ALWAYS_ALLOWED_SCOPES } from '../strategies/end-users';
import { isToMany, matchesAccepts } from '../utils/builder/compile';
import { builderConditionOf } from '../utils/builder/registry';
import { inputsNegated } from '../utils/builder/usage';
import {
  permissionRefusal,
  refuseDuplicatePermissions,
  toStoredDiff,
} from '../utils/permission-row';
import type { PermissionDiff, PermissionRow } from '../utils/permission-row';
import type { TransactionHooks } from '../utils/transaction-hooks';
import type abilityService from './ability';
import { isPlain } from '../utils/is-plain';

type ContentApiConditionDefinition = Modules.ContentAPI.ContentApiConditionDefinition;
type ContentApiConditionParam = Modules.ContentAPI.ContentApiConditionParam;

/** A permission as it is read: its row, its own id, and the role it belongs to. */
export interface StoredPermission extends PermissionRow {
  documentId: string;
  roleDocumentId: string;
  roleName: string;
}

/** Rows written (or removed) per statement: one database round trip each. */
const CHUNK_SIZE = 500;

const chunksOf = <T>(items: readonly T[]): T[][] => {
  const chunks: T[][] = [];

  for (let start = 0; start < items.length; start += CHUNK_SIZE) {
    chunks.push(items.slice(start, start + CHUNK_SIZE));
  }

  return chunks;
};

type Row = Record<string, unknown>;

type Plain = Record<string, unknown>;

const hasOwn = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key);

/** The part of a row the checks refuse, as the error's path names it, and why */
type RowProblem = Pick<PermissionProblem, 'key' | 'reason'>;

/**
 * The attributes of a registered schema. The registries are plain objects, so a key like
 * `constructor` finds an inherited value: only a schema that names itself by the uid counts.
 */
const attributesOf = (schema: unknown, uid: string): Plain | undefined =>
  isPlain(schema) && schema.uid === uid && isPlain(schema.attributes)
    ? schema.attributes
    : undefined;

/** An attribute of the schema itself, never one inherited from `Object.prototype` */
const attributeOf = (attributes: Plain | undefined, name: string): Plain | undefined => {
  if (attributes === undefined || name === '' || !hasOwn(attributes, name)) {
    return undefined;
  }

  const attribute = attributes[name];

  return isPlain(attribute) ? attribute : undefined;
};

/** The types a condition param may declare, as a refusal names them */
const PARAM_TYPE_NAMES: Record<ContentApiConditionParam['type'], string> = {
  string: 'a string',
  number: 'a number',
  boolean: 'true or false',
  attribute: 'the name of an attribute',
};

/**
 * Whether a param value has its declared type: what core's own check of a row's params accepts.
 * Mirrors `hasType` in core's `conditions.ts` (`content-api/permissions`): change one, change both.
 */
const hasParamType = (value: unknown, type: ContentApiConditionParam['type']): boolean => {
  switch (type) {
    case 'string':
    case 'attribute':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    default:
      return false;
  }
};

/**
 * The first param a row gives that a built-in condition doesn't declare, or undefined. A built-in
 * reads only what it declares, so any other is a typo that does nothing (`{ feild: 'author' }` would
 * quietly take the type's one user relation). A project condition keeps its own: core passes every
 * param on as `$params.<name>`, and a condition may read one it never declared.
 */
const undeclaredParam = (
  definition: ContentApiConditionDefinition,
  params: Plain | undefined
): string | undefined =>
  definition.source === 'builtin' && params !== undefined
    ? Object.keys(params).find((name) => !hasOwn(definition.params ?? {}, name))
    : undefined;

/** The kind of field a builder input takes, as a refusal names it */
const acceptsText = (accepts: NonNullable<FieldAccepts>): string =>
  typeof accepts === 'object' ? `a relation to ${accepts.relation}` : `a ${accepts} field`;

/**
 * A row without the params its builder condition no longer declares: the input was removed from the
 * file, and the value a role bound to it goes with the next save. Any other condition keeps its
 * params.
 */
const declaredParamsOnly = (
  refs: ConditionRef[],
  definitionOf: (name: string) => ContentApiConditionDefinition | undefined
): ConditionRef[] =>
  refs.map((ref) => {
    const definition = definitionOf(ref.name);

    if (definition?.source !== 'builder' || ref.params === undefined) {
      return ref;
    }

    const kept = Object.entries(ref.params).filter(([param]) =>
      hasOwn(definition.params ?? {}, param)
    );

    if (kept.length === Object.keys(ref.params).length) {
      return ref;
    }

    return kept.length > 0 ? { ...ref, params: Object.fromEntries(kept) } : { name: ref.name };
  });

const relationsText = (relations: string[], target: string) =>
  relations.length === 0
    ? `no relation to ${target}`
    : `${relations.length} relation${relations.length === 1 ? '' : 's'} to ${target} (${relations.join(', ')})`;

/**
 * `strapi.plugin('end-users').service('permission')`: the permissions of the roles.
 *
 * Reads and writes go to the database layer rather than the Document Service. A role can hold
 * thousands of rows, and the Document Service would write them one at a time, each with its own
 * validation; this table is the plugin's own and nobody manages it by hand. The role is a plain
 * foreign key column on the row (`useJoinTable: false`), which is what lets `createMany` set it.
 */
const permissionService = ({ strapi }: { strapi: Core.Strapi }) => {
  const permissions = () => strapi.db.query(PERMISSION_UID);
  const ability = () =>
    strapi.plugin(PLUGIN_ID).service('ability') as ReturnType<typeof abilityService>;

  /** Core's: the content type whose controller owns the action, or null */
  const subjectOf = (action: string): string | null =>
    strapi.contentAPI.permissions.subjectOf(action);

  /**
   * Why `path` is not a field of `uid`, or undefined when it is: an attribute of the type, or a
   * path through its components to an attribute of one (`seo.metaTitle`, `seo.og.title`). Nothing
   * else has fields under it: not a relation, media or a dynamic zone.
   */
  const fieldProblem = (uid: string, path: string): string | undefined => {
    const segments = path.split('.');
    let attributes = attributesOf(strapi.contentType(uid as UID.ContentType), uid);

    for (const [index, segment] of segments.entries()) {
      const attribute = attributeOf(attributes, segment);

      if (attribute === undefined) {
        return `the field "${path}" is not an attribute of ${uid}, or a field of one of its components`;
      }

      if (index < segments.length - 1) {
        if (attribute.type !== 'component' || typeof attribute.component !== 'string') {
          return `the field "${path}" goes under "${segment}", which is not a component: only a component's fields are named under it`;
        }

        attributes = attributesOf(
          strapi.getModel(attribute.component as UID.Component),
          attribute.component
        );
      }
    }

    return undefined;
  };

  /**
   * Why a param a condition declares is not one the row can use on `uid`, or undefined. The
   * declared default fills a param the row leaves out or sets to null, as core does when it runs the
   * condition. An `attribute` param names an attribute of `uid`; with a `relationTarget`, a relation
   * of `uid` to that type, and it is needed whenever `uid` has anything but exactly one such
   * relation (then nothing says which one it means: what `is-owner`'s `ownerField` reads).
   */
  const paramProblem = (
    uid: string,
    condition: string,
    name: string,
    declaration: ContentApiConditionParam,
    params: Plain | undefined
  ): string | undefined => {
    const given = params !== undefined && hasOwn(params, name) ? params[name] : undefined;
    const value = given ?? declaration.default;
    const missing = value === undefined || value === null;
    const { type, required, relationTarget } = declaration;
    const builder = builderConditionOf(strapi, condition);
    const input = builder?.inputs.find((declared) => declared.name === name);

    if (type === 'attribute' && typeof relationTarget === 'string') {
      const relations = relationsTo(uid, relationTarget);

      if (missing) {
        return isParamNeeded(declaration, relations.length)
          ? `the condition "${condition}" needs "${name}": ${uid} has ${relationsText(relations, relationTarget)}, so it must say which one`
          : undefined;
      }

      if (!(typeof value === 'string' && relations.includes(value))) {
        return `the condition "${condition}": "${name}" names a relation of ${uid} to ${relationTarget}, and ${uid} has ${relationsText(relations, relationTarget)}`;
      }

      // A to-many relation can't be negated ("some entry is not" is not "none is"): the engine would
      // read the row as false, and this says why
      const bound = attributeOf(
        attributesOf(strapi.contentType(uid as UID.ContentType), uid),
        value
      );

      return builder !== undefined &&
        bound !== undefined &&
        isToMany(bound) &&
        inputsNegated(builder).has(name)
        ? `the condition "${condition}" negates "${name}" (a "not" operator or a "none of" group), so "${value}" can't be bound to it: ${value} is a to-many relation of ${uid}`
        : undefined;
    }

    if (missing) {
      return required
        ? `the condition "${condition}" needs "${name}", ${PARAM_TYPE_NAMES[type]}`
        : undefined;
    }

    if (!hasParamType(value, type)) {
      return `the condition "${condition}": "${name}" is ${PARAM_TYPE_NAMES[type]}`;
    }

    if (
      type === 'attribute' &&
      attributeOf(
        attributesOf(strapi.contentType(uid as UID.ContentType), uid),
        value as string
      ) === undefined
    ) {
      return `the condition "${condition}": "${name}" names an attribute of ${uid}, and "${value}" is not one`;
    }

    const chosen = attributeOf(
      attributesOf(strapi.contentType(uid as UID.ContentType), uid),
      value as string
    );

    // A builder input takes one kind of field: "the server refuses a row that names another kind"
    return type === 'attribute' &&
      input?.accepts !== undefined &&
      chosen !== undefined &&
      !matchesAccepts(chosen, input.accepts)
      ? `the condition "${condition}": "${name}" takes ${acceptsText(input.accepts)}, and "${value}" is a ${String(chosen.type)} field of ${uid}`
      : undefined;
  };

  /** Why a condition can't narrow a row on `uid`, or undefined */
  const conditionProblem = (
    uid: string,
    { name, params }: PermissionRow['conditions'][number]
  ): string | undefined => {
    const bound = strapi.contentAPI.permissions.providers.condition.get(name);

    if (bound === undefined) {
      return `"${name}" is not a registered condition`;
    }

    const { definition } = bound;

    if (!strapi.contentAPI.permissions.conditions.appliesTo(definition, uid)) {
      return `the condition "${name}" does not apply to ${uid}`;
    }

    const stray = undeclaredParam(definition, params);

    if (stray !== undefined) {
      const declared = Object.keys(definition.params ?? {});

      return `the condition "${name}" takes ${declared.length === 0 ? 'no params' : `only ${declared.join(', ')}`}, not "${stray}"`;
    }

    for (const [param, declaration] of Object.entries(definition.params ?? {})) {
      const problem = paramProblem(uid, name, param, declaration, params);

      if (problem !== undefined) {
        return problem;
      }
    }

    return undefined;
  };

  /** The first rule a row breaks, or undefined: see `checkRows` */
  const rowProblem = ({ action, subject, properties, conditions }: PermissionRow) => {
    const { providers } = strapi.contentAPI.permissions;

    if (ALWAYS_ALLOWED_SCOPES.includes(action)) {
      return {
        key: 'action',
        reason: 'every caller is always allowed this action, so no role is granted it',
      } satisfies RowProblem;
    }

    if (!providers.action.has(action) && !providers.syntheticAction.has(action)) {
      return {
        key: 'action',
        reason:
          "no Content API route or synthetic action (read-drafts, publish, a single type's create) has this action",
      } satisfies RowProblem;
    }

    const owner = subjectOf(action);

    if (subject !== null && subject !== owner) {
      return {
        key: 'subject',
        reason:
          owner === null
            ? `the action belongs to no content type, so its subject is null, not "${subject}"`
            : `the subject is "${subject}", and the action belongs to ${owner}: its subject is null or ${owner}`,
      } satisfies RowProblem;
    }

    const { fields, populateDepth } = properties;

    if (
      populateDepth !== undefined &&
      populateDepth !== null &&
      !(Number.isInteger(populateDepth) && populateDepth >= 0)
    ) {
      return {
        key: 'properties',
        reason: `populateDepth is a whole number, 0 or more, or null, not ${populateDepth}`,
      } satisfies RowProblem;
    }

    if (owner === null) {
      if (Array.isArray(fields) && fields.length > 0) {
        return {
          key: 'properties',
          reason: 'the action belongs to no content type, so it has no fields to list',
        } satisfies RowProblem;
      }

      if (conditions.length > 0) {
        return {
          key: 'conditions',
          reason: 'the action belongs to no content type, so it has no entries a condition narrows',
        } satisfies RowProblem;
      }

      return undefined;
    }

    for (const field of fields ?? []) {
      const reason = fieldProblem(owner, field);

      if (reason !== undefined) {
        return { key: 'properties', reason } satisfies RowProblem;
      }
    }

    for (const condition of conditions) {
      const reason = conditionProblem(owner, condition);

      if (reason !== undefined) {
        return { key: 'conditions', reason } satisfies RowProblem;
      }
    }

    return undefined;
  };

  /** Every row the engine could not trust, and the first rule each breaks: see `checkRows` */
  const findProblems = (rows: PermissionRow[]): Array<Omit<PermissionProblem, 'documentId'>> =>
    rows.flatMap((row, index) => {
      const problem = rowProblem(row);

      return problem === undefined ? [] : [{ index, action: row.action, ...problem }];
    });

  return {
    /**
     * The rows the engine could not trust, each with its place in `rows`, its action, the part
     * that breaks a rule (`key`, as the error's path names it) and why. The first rule a row
     * breaks is the one reported, and a row that breaks none is not listed. It never throws for a
     * row: a stored row whose action, field or condition has gone is what it is for (see
     * `checkRows` for what a row must be). `role.get` gives the problems of the stored rows, and
     * `role.update` refuses a diff that has one.
     */
    findProblems,

    /**
     * Throws a `ValidationError` for the first row the engine could not trust (the first entry of
     * `findProblems`), naming it by its place in the list: `Permission <n> (<action>): <reason>`,
     * with the path `['permissions', n, <key>]` in `details.errors`. Run on every row an admin
     * saves and on an imported file, by `role.create`, `role.fromFile` and
     * `role.update`. A row is trusted when:
     *
     * - its action is a Content API route's or a synthetic one (`<uid>.read-drafts`,
     *   `<uid>.publish` of a draft & publish type), and not one every caller has without a grant
     *   (`ALWAYS_ALLOWED_SCOPES`);
     * - its subject is null or the action's own content type (`subjectOf`);
     * - `populateDepth` is a whole number, 0 or more, or null;
     * - with a content type, each field is an attribute of it or a path through its components to
     *   one (`seo.metaTitle`), and each condition is registered, applies to the type, and has the
     *   params it declares, of their types (an `attribute` param names an attribute; with a
     *   `relationTarget`, a relation to that type, needed unless there is exactly one), and a
     *   built-in condition is given no param it doesn't declare (a project's keeps them);
     * - without one (a route-only row), it lists no fields and no conditions.
     *
     * Duplicates are not its business: `role.create` and `applyDiff` refuse them.
     */
    checkRows(rows: PermissionRow[]): void {
      const [first] = findProblems(rows);

      if (first !== undefined) {
        throw permissionRefusal(first);
      }
    },

    /**
     * The permissions of these roles, each saying which role it is from, so the union of several
     * roles can still tell where a permission came from.
     */
    async findForRoles(roleDocumentIds: string[]): Promise<StoredPermission[]> {
      if (roleDocumentIds.length === 0) {
        return [];
      }

      const found = (await permissions().findMany({
        where: { role: { documentId: { $in: roleDocumentIds } } },
        populate: { role: { select: ['documentId', 'name'] } },
        orderBy: { id: 'asc' },
      })) as Array<Row & { role: { documentId: string; name: string } }>;

      return found.map((permission) => ({
        documentId: permission.documentId as string,
        action: permission.action as string,
        subject: (permission.subject as string | null | undefined) ?? null,
        properties: (permission.properties as PermissionRow['properties'] | null) ?? {},
        conditions: (permission.conditions as PermissionRow['conditions'] | null) ?? [],
        roleDocumentId: permission.role.documentId,
        roleName: permission.role.name,
      }));
    },

    /**
     * Changes one role's permissions by a diff, all of it or none of it. Nothing is ever deleted
     * unless the diff names it, so saving a role cannot wipe its permissions.
     *
     * Every write is scoped to the role: a diff cannot touch another role's rows, whatever
     * `documentId`s it carries. A row to update that is not on the role is an error and undoes the
     * whole diff; a row to delete that is not there is simply not there.
     *
     * A role has an action on a subject once, a row with no subject being on its action's content
     * type. A diff that would leave it twice (two new rows, a new row next to one the
     * role keeps, an update that makes two rows the same) is refused, and undone when it is only
     * found after the writes. What the rows name is not checked here: `role.update` checks a diff
     * (`findProblems`) before it applies it.
     *
     * The ability service keeps the permissions of a role for a while, and clears them when a write
     * to the table is reported, which happens as the statement runs: before the transaction commits,
     * when a request that reads the rows again still gets the old ones and keeps them. So they are
     * cleared once more when the transaction has committed (when the outermost one has, if this
     * is part of a bigger one), and not at all when it is rolled back.
     */
    async applyDiff(roleDocumentId: string, diff: PermissionDiff): Promise<void> {
      // Checked before a transaction is opened: a malformed diff writes nothing
      const stored = toStoredDiff(diff);
      const definitionOf = (name: string) =>
        strapi.contentAPI.permissions.providers.condition.get(name)?.definition;
      const toCreate = stored.create.map((row) => ({
        ...row,
        conditions: declaredParamsOnly(row.conditions, definitionOf),
      }));
      const toUpdate = stored.update.map((changes) =>
        changes.conditions === undefined
          ? changes
          : { ...changes, conditions: declaredParamsOnly(changes.conditions, definitionOf) }
      );
      const toDelete = stored.delete;

      refuseDuplicatePermissions(toCreate, subjectOf);

      // The same value the Document Service gives a row of a type without draft and publish; the
      // rows are read back through relations, which look for a published row
      const publishedAt = new Date();

      await strapi.db.transaction(async ({ onCommit }: TransactionHooks) => {
        const role = await strapi.db
          .query(ROLE_UID)
          .findOne({ where: { documentId: roleDocumentId }, select: ['id'] });

        if (!role) {
          throw new errors.NotFoundError('Role not found');
        }

        onCommit(() => ability().invalidate());

        const scope = { role: { id: role.id } };

        /* eslint-disable no-await-in-loop -- the writes share the transaction's single connection, so they run one at a time */
        for (const ids of chunksOf(toDelete)) {
          await permissions().deleteMany({ where: { ...scope, documentId: { $in: ids } } });
        }
        /* eslint-enable no-await-in-loop */

        // One at a time: each row has its own values, and they share the transaction's connection
        /* eslint-disable no-await-in-loop -- the writes share the transaction's single connection, so they run one at a time */
        for (const { documentId, ...changes } of toUpdate) {
          const updated = await permissions().update({
            where: { ...scope, documentId },
            data: changes,
          });

          if (!updated) {
            throw new errors.NotFoundError(`Permission ${documentId} not found on this role`);
          }
        }
        /* eslint-enable no-await-in-loop */

        /* eslint-disable no-await-in-loop -- the writes share the transaction's single connection, so they run one at a time */
        for (const rows of chunksOf(toCreate)) {
          await permissions().createMany({
            data: rows.map((row) => ({ ...row, role: role.id, publishedAt })),
          });
        }
        /* eslint-enable no-await-in-loop */

        const changesWhatARowIs =
          toCreate.length > 0 ||
          toUpdate.some(({ action, subject }) => action !== undefined || subject !== undefined);

        if (changesWhatARowIs) {
          // What the role has now, the diff's own writes included: one read, and an error here
          // undoes them. The `id` is read too: the filter on the role makes the query a join, and
          // the database layer then selects DISTINCT, which would fold two rows with the same
          // action and subject into one, the very duplicate this looks for.
          const now = (await permissions().findMany({
            where: scope,
            select: ['id', 'action', 'subject'],
          })) as Array<{ id: number; action: string; subject: string | null }>;

          refuseDuplicatePermissions(now, subjectOf);
        }
      });
    },
  };
};

export default permissionService;

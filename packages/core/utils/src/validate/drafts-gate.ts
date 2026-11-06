import { isPlainObject, isString } from 'lodash';

import { hasDraftAndPublish, isMorphToRelationalAttribute } from '../content-types';
import {
  createDraftReadPermission,
  draftReadOf,
  draftsReach,
  readsDrafts,
  type DraftVia,
} from '../content-api-drafts';
import type { PermissionChecker } from '../content-api-permissions';
import { PolicyError } from '../errors';
import parseType, { isBooleanLike } from '../parse-type';
import { traverseQueryFilters, traverseQuerySort } from '../traverse';
import type { AnyAttribute, Model } from '../types';

export interface DraftAccessContext {
  auth: unknown;
  checker: PermissionChecker;
  getModel(uid: string): Model;
  /**
   * Leaves the root's own drafts unchecked, for a write: its status says what it writes, and it
   * returns what it wrote. The types it reaches are still checked
   */
  skipRoot?: boolean;
}

/** The code of the drafts gate's 403 */
export const DRAFT_READ_FORBIDDEN = 'DRAFT_READ_FORBIDDEN';

const FILE_UID = 'plugin::upload.file';

type Node = Record<string, unknown>;

/**
 * A `PolicyError`, so REST clients see its message and details: core's authorize middleware turns
 * any other `ForbiddenError` into a bare 403. GraphQL formats it as `FORBIDDEN` with the
 * details.
 */
const refuse = (uid: string): never => {
  throw new PolicyError('Reading drafts is not allowed', { code: DRAFT_READ_FORBIDDEN, uid });
};

/** A relation with one target type: not a morphTo, whose types sit in its `on` fragments */
const targetOf = (attribute: AnyAttribute | undefined): string | undefined =>
  attribute?.type === 'relation' &&
  !isMorphToRelationalAttribute(attribute) &&
  typeof attribute.target === 'string'
    ? attribute.target
    : undefined;

/**
 * Whether the query params converter loads an attribute given this value in a populate object: a
 * boolean is itself, a boolean keyword is that boolean, any other non-empty string and an object
 * are true (`convertPopulateObject`, `convertNestedPopulate`).
 */
const populates = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (isString(value)) {
    return isBooleanLike(value) ? parseType({ type: 'boolean', value }) : value.length > 0;
  }

  return isPlainObject(value);
};

/**
 * Refuses (403 `DRAFT_READ_FORBIDDEN`, naming the type) a query that reads drafts the caller may
 * not read. The caller may read drafts of a type with a `read-drafts` row on it whose filter can
 * match an entry.
 *
 * - On a draft-and-publish type, `status` other than `'published'`, `hasPublishedVersion` or
 *   `publicationFilter` needs `read-drafts` on it.
 * - Under such a status, each draft-and-publish type a relation filter or a sort reaches (at any
 *   depth, through relations and components, in the root's and every populate node's `filters`
 *   and `sort`) needs `read-drafts` too: a draft links to drafts.
 * - Under such a status or a publication filter, each draft-and-publish type `populate` loads
 *   needs `read-drafts` too: the query layer applies both to every populated type. That holds from
 *   a root without draft & publish as well.
 *
 * Only an active checker is asked anything beyond `isActive`. `validate.query` passes `skipRoot`
 * for writes: their root is not gated, the types they reach are.
 * `sanitize.query` removes what this refuses at the root and denies what it refuses below, for
 * controllers that skip `validate.query`.
 */
export const assertDraftAccess = async (
  query: Record<string, unknown>,
  schema: Model,
  { auth, checker, getModel, skipRoot = false }: DraftAccessContext
): Promise<void> => {
  if (!checker.isActive(auth)) {
    return;
  }

  const read = draftReadOf(query);

  if (!readsDrafts(read)) {
    return;
  }

  const mayReadDrafts = createDraftReadPermission(checker, auth);

  if (!skipRoot && hasDraftAndPublish(schema) && !mayReadDrafts(schema.uid)) {
    refuse(schema.uid);
  }

  const check = (uid: string | undefined, via: DraftVia) => {
    if (uid === undefined || !draftsReach(read, via)) {
      return;
    }

    const model = getModel(uid);

    if (model !== undefined && hasDraftAndPublish(model) && !mayReadDrafts(uid)) {
      refuse(uid);
    }
  };

  const checkFilters = async (filters: unknown, filtersSchema: Model) => {
    if (filters === undefined || filters === null) {
      return;
    }

    await traverseQueryFilters(
      ({ attribute }) => check(targetOf(attribute), 'filter'),
      { schema: filtersSchema, getModel },
      filters
    );
  };

  const checkSort = async (sort: unknown, sortSchema: Model) => {
    if (sort === undefined || sort === null) {
      return;
    }

    await traverseQuerySort(
      ({ attribute }) => check(targetOf(attribute), 'filter'),
      { schema: sortSchema, getModel },
      sort
    );
  };

  /** Every relation of a type, one level down: what `true` and `'*'` load */
  const checkEveryRelation = (populateSchema: Model) => {
    for (const attribute of Object.values(populateSchema.attributes ?? {})) {
      check(targetOf(attribute as AnyAttribute), 'populate');
    }
  };

  /** A dotted path (`seo.tags`) walked as the query layer reads it */
  const checkPath = (parts: string[], pathSchema: Model | undefined) => {
    const [key, ...rest] = parts;
    const attribute = pathSchema?.attributes?.[key] as AnyAttribute | undefined;

    if (attribute === undefined) {
      return;
    }

    const target = targetOf(attribute);

    if (target !== undefined) {
      check(target, 'populate');
    }

    if (rest.length === 0) {
      return;
    }

    if (target !== undefined) {
      checkPath(rest, getModel(target));
    } else if (attribute.type === 'component') {
      checkPath(rest, getModel(attribute.component));
    } else if (attribute.type === 'media') {
      checkPath(rest, getModel(FILE_UID));
    } else if (attribute.type === 'dynamiczone') {
      // The rest of the path is read on every component of the zone
      for (const component of attribute.components ?? []) {
        checkPath(rest, getModel(component));
      }
    }
  };

  /** A populate node's options, read by name as the query params converter reads them */
  const checkNode = async (node: unknown, target: Model | undefined) => {
    if (!isPlainObject(node) || target === undefined) {
      return;
    }

    const { filters, sort, populate } = node as Node;

    await checkFilters(filters, target);
    await checkSort(sort, target);
    await checkPopulate(populate, target);
  };

  const checkEntry = async (key: string, value: unknown, entrySchema: Model) => {
    const attribute = entrySchema.attributes?.[key] as AnyAttribute | undefined;

    if (attribute === undefined || !populates(value)) {
      return;
    }

    const isMorph = isMorphToRelationalAttribute(attribute);

    if (isMorph || attribute.type === 'dynamiczone') {
      const node = isPlainObject(value) ? (value as Node) : {};

      if (isPlainObject(node.on)) {
        for (const [uid, fragment] of Object.entries(node.on as Node)) {
          // The query layer loads every type a morph `on` lists, whatever its value
          if (isMorph) {
            check(uid, 'populate');
          }

          // eslint-disable-next-line no-await-in-loop
          await checkNode(fragment, getModel(uid));
        }
      }

      if (attribute.type === 'dynamiczone') {
        // The query layer loads every component of a zone with its nested `populate` (any form,
        // as `sanitize.query` reads it): `'*'` is every relation of each, paths, lists and
        // objects are walked on each, nodes and all
        for (const component of attribute.components ?? []) {
          // eslint-disable-next-line no-await-in-loop
          await checkPopulate(node.populate, getModel(component));
        }
      }

      return;
    }

    const target = targetOf(attribute);

    if (target !== undefined) {
      check(target, 'populate');
      await checkNode(value, getModel(target));
    } else if (attribute.type === 'component') {
      await checkNode(value, getModel(attribute.component));
    } else if (attribute.type === 'media') {
      await checkNode(value, getModel(FILE_UID));
    }
  };

  const checkPopulate = async (populate: unknown, populateSchema: Model | undefined) => {
    if (populateSchema === undefined || populate === undefined || populate === null) {
      return;
    }

    if (populate === true || populate === '*') {
      checkEveryRelation(populateSchema);

      return;
    }

    if (isString(populate) || Array.isArray(populate)) {
      const paths = (Array.isArray(populate) ? populate : [populate])
        .filter(isString)
        .flatMap((value) => value.split(','))
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

      for (const path of paths) {
        checkPath(path.split('.'), populateSchema);
      }

      return;
    }

    if (isPlainObject(populate)) {
      for (const [key, value] of Object.entries(populate as Node)) {
        // eslint-disable-next-line no-await-in-loop
        await checkEntry(key, value, populateSchema);
      }
    }
  };

  await checkFilters(query.filters, schema);
  await checkSort(query.sort, schema);
  await checkPopulate(query.populate, schema);
};

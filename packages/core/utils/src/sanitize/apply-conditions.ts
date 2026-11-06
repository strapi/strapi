import { cloneDeep, isEmpty, isPlainObject, isString, omit, pickBy } from 'lodash';

import {
  constants,
  hasDraftAndPublish,
  isMorphToRelationalAttribute,
  isScalarAttribute,
} from '../content-types';
import {
  queryActionFor,
  restrictsEntries,
  withDeny,
  type ExplainEntry,
  type PermissionChecker,
} from '../content-api-permissions';
import {
  NO_DRAFT_READ,
  createDraftReadPermission,
  createJoinWalk,
  draftReadOf,
  draftsReach,
  isWriteAction,
  joinPathOf,
  joinsDrafts,
  reachOf,
  readsDrafts,
  type JoinReach,
} from '../content-api-drafts';
import { ValidationError } from '../errors';
import { isOperator, isOperatorOfType } from '../operators';
import parseType, { isBooleanLike } from '../parse-type';
import { hasSort } from '../sort-query';
import { traverseQueryFilters, traverseQueryPopulate, traverseQuerySort } from '../traverse';
import type { Visitor } from '../traverse/factory';
import type { AnyAttribute, Model, RelationalAttribute } from '../types';
import { expandWildcardPopulate, removeRestrictedRelations } from './visitors';

/**
 * The Content API's condition step of `sanitize.query`: it restricts a query to the entries the
 * caller's data rules let them read.
 *
 * - The root `filters` are ANDed with the caller's filters for (`queryActionFor(action)`, uid):
 *   `update` and `delete` narrow by their own rules, reads by the read action's.
 * - Every populated relation node gets its target's `find` filters ANDed into its own `filters`,
 *   through components, dynamic-zone `on` fragments and morph `on` fragments. Before that, a
 *   relation whose target's `find` scope the caller lacks is removed, as the stock step removes
 *   it, including those a dynamic zone's nested `populate` reaches.
 * - Every relation key inside `filters` (the root's and each populate node's) whose target is
 *   restricted becomes `{ $and: [value, condition, { id: { $notNull: true } }] }`, so a filter
 *   through a relation can't probe entries the caller can't read. A `$not` above such a
 *   key matches nothing, and a where object holding one is split into an `$and` of its
 *   keys, so the query layer can't merge two `$and` into one.
 * - Sorts through a relation to a restricted type are dropped: Strapi's sort syntax can't carry a
 *   condition (`validate.query` refuses them).
 * - Drafts (`validate.query` answers 403 `DRAFT_READ_FORBIDDEN` instead). A read of a
 *   draft-and-publish root whose `status`, `hasPublishedVersion` or `publicationFilter` reads
 *   drafts loses them when the caller may not read its drafts: `status` becomes `'published'` (the
 *   Document Service reads a missing status as draft), the other two are removed, and
 *   `draft-status-removed` is recorded. A caller who may gets the root's `read-drafts` filters
 *   ANDed too. Every draft-and-publish type the read reaches below (populate, under a draft status
 *   or a publication filter; relation filters and sorts, under a draft status) is restricted by
 *   its `read-drafts` filters as well as its `find` ones, and denied without `read-drafts`: a
 *   draft links to drafts, so its relations have no published version to show instead. The root
 *   of a write keeps its status and gets no `read-drafts` filter, as it returns what it wrote
 *  ; the types a write reaches are restricted as a read's are.
 * - Outside a draft read, a relation filter or sort into a draft-and-publish type, joined from
 *   rows that link to its drafts (a type without draft & publish links to both versions, at any
 *   depth of the path; {@link JoinReach}), reads its published versions only, or those and the
 *   drafts the caller's `read-drafts` filters allow. The status filter never reaches
 *   a join. Such a sort is dropped and such a `$not` matches nothing, as for any restriction.
 *
 * Conditions are always ANDed, never merged by key: a caller's `filters[owner]` would otherwise
 * replace the condition's. The condition filters are inserted as the checker gives them and never
 * sanitized: a sanitizer drops private fields and empty lists, which would widen them.
 * That is why `sanitize.query` calls this last, after its stock steps.
 *
 * A type the caller holds no row for gets nothing (`filtersFor` answers `{}`); a held row with no
 * data rule denies (`filtersFor` answers `null` or the deny filter). Media nodes get no condition
 * of their own. Only an active checker is asked anything beyond `isActive`.
 */

export interface ApplyConditionsContext {
  auth: unknown;
  /** The data action of the request; the root reads `queryActionFor(action)` */
  action?: string;
  checker: PermissionChecker;
  getModel(uid: string): Model;
}

type Filters = Record<string, unknown>;
type Populated = Record<string, unknown>;
type RelationTo = RelationalAttribute & { target: string };
/** A where with its objects split, and whether it holds a relation filter to a restricted type */
type Split = { value: unknown; holds: boolean };
/**
 * How a related type is reached: by `populate`, or by a relation filter or sort joined from rows
 * of a {@link JoinReach}
 */
type Reached = 'populate' | JoinReach;

/**
 * A relation whose target a condition can be attached to: not a morphTo (it has no single target;
 * its `on` fragments are conditioned instead)
 */
const isRelationTo = (attribute?: AnyAttribute): attribute is RelationTo =>
  attribute?.type === 'relation' &&
  !isMorphToRelationalAttribute(attribute) &&
  typeof attribute.target === 'string';

/** Whether the query params converter populates a relation given this value */
const populates = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (isString(value)) {
    // A boolean keyword is that boolean; any other string is cast (`convertPopulateObject`)
    return isBooleanLike(value) ? parseType({ type: 'boolean', value }) : value.length > 0;
  }

  return isPlainObject(value);
};

/** Splits comma lists the way the query params converter does, before anything reads paths */
const splitPopulatePaths = (populate: unknown): unknown => {
  const split = (value: string) =>
    value
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

  if (isString(populate) && populate.includes(',')) {
    return split(populate);
  }

  if (Array.isArray(populate) && populate.some((item) => isString(item) && item.includes(','))) {
    return populate.flatMap((item) => (isString(item) ? split(item) : [item]));
  }

  return populate;
};

const invalidFilters = () =>
  new ValidationError('The filters parameter must be an object or an array');

/**
 * ANDs a condition onto filters: the condition alone for none, a list's items flattened into the
 * `$and` (a root list is an implicit AND, and the query layer does not process a list nested in
 * `$and`). Anything else can't carry a condition, so it is refused as the query layer would.
 */
const and = (filters: unknown, condition: Filters): Filters => {
  if (filters === undefined || filters === null) {
    return condition;
  }

  if (Array.isArray(filters)) {
    return filters.length === 0 ? condition : { $and: [...filters, condition] };
  }

  if (isPlainObject(filters)) {
    return isEmpty(filters) ? condition : { $and: [filters, condition] };
  }

  throw invalidFilters();
};

/**
 * Whether a relation key's value is a match on the related entry's id: an object of operators only,
 * none of them a group (`$in`, `$null`, …). `processRelationWhere` reads it as `relation.id <op>`.
 */
const isIdMatch = (value: Filters): boolean => {
  const keys = Object.keys(value);

  return (
    keys.length > 0 &&
    keys.every((key) => isOperator(key)) &&
    !keys.some((key) => isOperatorOfType('group', key))
  );
};

/**
 * The value of a relation key in a where clause, as one the query layer can AND. It reads a scalar,
 * a list, or an object of operators only (`$in`, `$null`, …) as a match on the related entry's id
 * (`processRelationWhere`); inside `$and` those would be root-level operators, which it refuses.
 */
const toRelationWhere = (value: unknown): unknown => {
  if (!isPlainObject(value)) {
    return { id: value };
  }

  return isIdMatch(value as Filters) ? { id: value } : value;
};

/**
 * Whether a relation key's value is a where on the related type: any plain object that is not an
 * id match ({@link toRelationWhere} keeps it as it is). That includes an object mixing operators
 * and attribute keys (`{ $and: […], notes: {…} }`): once it sits in an `$and` (a wrapped relation,
 * or a split), the query layer reads it key by key with `processWhere`, and merges what its keys
 * give, so it is split like any other where.
 */
const isRelationWhere = (value: unknown): boolean =>
  isPlainObject(value) && !isIdMatch(value as Filters);

/**
 * What a `$not` gets in place of a where through a restricted relation: true of every row, the row
 * of nulls a LEFT JOIN adds included, so the `$not` matches nothing. The deny filter itself
 * (`id IS NULL`) would be true of that row of nulls.
 */
const everyRow = (): Filters => ({ $or: [{ id: { $null: true } }, { id: { $notNull: true } }] });

/**
 * What a relation filter or sort into a draft-and-publish type gets when the rows it is joined from
 * link to drafts the caller may not read: its published versions only
 */
const publishedOnly = (): Filters => ({ [constants.PUBLISHED_AT_ATTRIBUTE]: { $notNull: true } });

const joinPath = (...parts: Array<string | null | undefined>) =>
  parts.filter((part): part is string => !!part).join('.') || undefined;

const FILE_UID = 'plugin::upload.file';

export const applyConditions = async (
  query: Record<string, unknown>,
  schema: Model,
  ctx: ApplyConditionsContext
): Promise<Record<string, unknown>> => {
  const { auth, action, checker, getModel } = ctx;

  if (!checker.isActive(auth)) {
    return query;
  }

  /** One answer per (action, uid) for the whole query; undefined when unrestricted */
  const answers = new Map<string, Filters | undefined>();
  const restrictionOf = (dataAction: string, uid: string) => {
    const key = `${dataAction}\u0000${uid}`;

    if (!answers.has(key)) {
      const filters = checker.filtersFor(auth, dataAction, uid);

      answers.set(key, restrictsEntries(filters) ? withDeny(filters) : undefined);
    }

    return answers.get(key);
  };

  const isDraftAndPublish = (uid: string) => {
    const model = getModel(uid);

    return model !== undefined && hasDraftAndPublish(model);
  };

  // Shares the read-drafts answers (undefined is `{}`: unrestricted)
  const mayReadDrafts = createDraftReadPermission(
    checker,
    auth,
    (uid) => restrictionOf('read-drafts', uid) ?? {}
  );

  // How the query reads drafts. The root of a write is exempt: its status says what it writes, and
  // it returns what it wrote. The types it reaches are not
  const requested = draftReadOf(query);
  const gatesRoot = !isWriteAction(action) && hasDraftAndPublish(schema);
  // A draft-and-publish root whose drafts the caller may not read loses its draft params below
  const stripsRoot = gatesRoot && readsDrafts(requested) && !mayReadDrafts(schema.uid);
  const read = stripsRoot ? NO_DRAFT_READ : requested;

  /**
   * The `read-drafts` restriction on a draft-and-publish type the query reaches this way, when it
   * reads its drafts there; undefined when its drafts aren't read, or are read unrestricted.
   *
   * - Under a draft read (populate under a draft status or a publication filter; a relation filter
   *   or sort under a draft status): the caller's `read-drafts` filters, or the deny filter when
   *   they may not read its drafts.
   * - Otherwise, a relation filter or sort joined from rows that link to its drafts ({@link
   *   joinsDrafts}: from a type without draft & publish, at any depth): its published
   *   versions only, or those and the drafts the caller's `read-drafts` filters allow.
   */
  const draftRestrictionOf = (uid: string, reached: Reached): Filters | undefined => {
    if (!isDraftAndPublish(uid)) {
      return undefined;
    }

    if (draftsReach(read, reached === 'populate' ? 'populate' : 'filter')) {
      return mayReadDrafts(uid) ? restrictionOf('read-drafts', uid) : withDeny(null);
    }

    if (reached === 'populate' || !joinsDrafts(reached, getModel(uid))) {
      return undefined;
    }

    if (!mayReadDrafts(uid)) {
      return publishedOnly();
    }

    const readDrafts = restrictionOf('read-drafts', uid);

    return readDrafts === undefined ? undefined : { $or: [publishedOnly(), readDrafts] };
  };

  /** Whether reading `uid` through a relation is restricted: by its `find` rules or its drafts */
  const isRestricted = (uid: string, reached: Reached) =>
    restrictionOf('find', uid) !== undefined || draftRestrictionOf(uid, reached) !== undefined;

  const walk = createJoinWalk(getModel, mayReadDrafts);

  /**
   * The reach of the rows a visited key is joined from, in a filters or sort traversal started at
   * rows of `base` with `reach` (its paths relative to them): see {@link joinPathOf}
   */
  const reachAt = (base: Model, reach: JoinReach, attributePath: string | null, holdsKey = true) =>
    walk({ model: base, reach }, joinPathOf(attributePath, null, holdsKey)).reach;

  /** A copy of a restriction to insert for `uid`, recorded for explain; undefined when none */
  const insert = (
    restriction: Filters | undefined,
    dataAction: string,
    uid: string,
    at: 'root' | 'populate' | 'filter',
    path?: string
  ): Filters | undefined => {
    if (restriction === undefined) {
      return undefined;
    }

    // The checker knows which conditions and roles gave the filter; utils only sees the filter
    const entry: ExplainEntry = {
      kind: 'condition-applied',
      uid,
      action: dataAction,
      at,
      ...(path === undefined ? {} : { path }),
      conditions: [],
      roles: [],
    };

    checker.record(auth, entry);

    return cloneDeep(restriction);
  };

  /** Notes a part of the query that was dropped or made to match nothing, for explain */
  const narrowed = (
    uid: string,
    at: 'sort' | 'filter' | 'populate',
    reason: 'sort-dropped' | 'not-replaced' | 'morph-left-out' | 'populate-removed',
    path?: string | null,
    target?: string
  ) => {
    checker.record(auth, {
      kind: 'query-narrowed',
      uid,
      at,
      reason,
      ...(path ? { path } : {}),
      ...(target === undefined ? {} : { target }),
    });
  };

  /** A copy of the caller's condition for (dataAction, uid), recorded; undefined when none */
  const conditionFor = (
    dataAction: string,
    uid: string,
    at: 'root' | 'populate' | 'filter',
    path?: string
  ) => insert(restrictionOf(dataAction, uid), dataAction, uid, at, path);

  /** Both, ANDed when both restrict */
  const both = (first: Filters | undefined, second: Filters | undefined) =>
    first !== undefined && second !== undefined ? { $and: [first, second] } : (first ?? second);

  /**
   * What to insert for a type reached through a relation (populate, or a filter joined from rows of
   * a reach): its `find` condition and, when the query reads its drafts there, its `read-drafts`
   * restriction
   */
  const relationCondition = (uid: string, reached: Reached, path?: string): Filters | undefined => {
    const at = reached === 'populate' ? 'populate' : 'filter';

    return both(
      conditionFor('find', uid, at, path),
      insert(draftRestrictionOf(uid, reached), 'read-drafts', uid, at, path)
    );
  };

  /** Whether filters hold, at any depth, a relation key whose target is restricted */
  const holdsRestrictedRelation = async (
    filters: unknown,
    filtersSchema: Model,
    reach: JoinReach
  ) => {
    let holds = false;

    await traverseQueryFilters(
      ({ attribute, path }) => {
        if (
          !holds &&
          isRelationTo(attribute) &&
          isRestricted(attribute.target, reachAt(filtersSchema, reach, path.attribute))
        ) {
          holds = true;
        }
      },
      { schema: filtersSchema, getModel },
      filters
    );

    return holds;
  };

  /**
   * Makes every `$not` that holds a relation to a restricted type, at any depth, match nothing
   *. The query layer joins a relation filter with a LEFT JOIN and applies `$not` to
   * each joined row, so the rows of related entries the caller can't read, where the condition is
   * false, come out true under the negation: `$not: { notes: { id: { $notNull: true } } }` would
   * list the folders holding someone else's notes. A to-one relation is no safe exception: a
   * condition's own filter may join a to-many relation and multiply the rows. Dropping the `$not`
   * would widen the caller's filter; making it match nothing narrows it. The outermost such `$not`
   * is the one replaced, so no negation above it turns the replacement around.
   */
  const denyNegatedRestrictedRelations = (
    filters: unknown,
    filtersSchema: Model,
    reach: JoinReach
  ) =>
    traverseQueryFilters(
      async ({ key, value, attribute, schema: keySchema, path }, { set }) => {
        if (
          key === '$not' &&
          !attribute &&
          (await holdsRestrictedRelation(
            value,
            keySchema,
            reachAt(filtersSchema, reach, path.attribute, false)
          ))
        ) {
          narrowed(filtersSchema.uid as string, 'filter', 'not-replaced', path.attribute);
          set(key, everyRow());
        }
      },
      { schema: filtersSchema, getModel },
      filters
    );

  /**
   * Splits where objects so that a relation filter to a restricted type never shares one with
   * another key. The query layer merges what each key of a where object gives into one object
   * (`processWhere`'s `Object.assign`), so the `$and` a conditioned relation filter gives would
   * replace, or be replaced by, the `$and` of a sibling: another conditioned relation, the caller's
   * own `$and`, or a relation or component that holds one. The keys of a where object are an
   * implicit AND, so `{ a, b }` becomes `{ $and: [{ a }, { b }] }` when one of them is, or holds,
   * such a relation filter.
   *
   * Walked as the query layer reads a where: `$and`, `$or` and `$not` hold wheres of the same type;
   * a relation, component or media key holds a where of its target unless its value is an id match.
   */
  const splitWhere = (where: unknown, whereSchema: Model | undefined, reach: JoinReach): Split => {
    if (Array.isArray(where)) {
      const items = where.map((item) => splitWhere(item, whereSchema, reach));

      return { value: items.map((item) => item.value), holds: items.some((item) => item.holds) };
    }

    if (!isPlainObject(where)) {
      return { value: where, holds: false };
    }

    const entries = Object.entries(where as Filters).map(([key, value]) => ({
      key,
      ...splitKey(key, value, whereSchema, reach),
    }));
    const holds = entries.some((entry) => entry.holds);

    if (holds && entries.length > 1) {
      return { value: { $and: entries.map(({ key, value }) => ({ [key]: value })) }, holds };
    }

    return { value: Object.fromEntries(entries.map(({ key, value }) => [key, value])), holds };
  };

  const splitKey = (
    key: string,
    value: unknown,
    whereSchema: Model | undefined,
    reach: JoinReach
  ): Split => {
    if (key === '$and' || key === '$or' || key === '$not') {
      return splitWhere(value, whereSchema, reach);
    }

    const attribute = whereSchema?.attributes?.[key];

    if (
      !isRelationTo(attribute) &&
      attribute?.type !== 'component' &&
      attribute?.type !== 'media'
    ) {
      return { value, holds: false };
    }

    const next = walk({ model: whereSchema, reach }, [key]);
    const inner = isRelationWhere(value)
      ? splitWhere(value, next.model, next.reach)
      : { value, holds: false };
    const restricted = isRelationTo(attribute) && isRestricted(attribute.target, reach);

    return { value: inner.value, holds: inner.holds || restricted };
  };

  /**
   * ANDs the target's condition into every relation key of `filters` whose target is restricted,
   * at any depth. The conditions it inserts are not visited: a condition is used as given, so a
   * relation inside it is never conditioned in turn.
   *
   * A relation filter is a LEFT JOIN, so an entry with no related entry joins one row of nulls. The
   * deny filter (`id IS NULL`), or any condition such a row satisfies, would let that row through,
   * telling "has no related entries at all" apart from "has only ones you can't read". So the
   * related entry must also exist.
   */
  const wrapRestrictedRelations = (
    filters: unknown,
    filtersSchema: Model,
    reach: JoinReach,
    basePath?: string
  ) => {
    // Where the inserted conditions sit (`path.raw` of the `$and` item), so they are skipped
    const inserted: string[] = [];
    const isInserted = (raw: string | null) =>
      raw !== null && inserted.some((prefix) => raw.startsWith(`${prefix}.`));

    const visitor: Visitor = ({ key, attribute, value, path }, { set }) => {
      if (isInserted(path.raw) || !isRelationTo(attribute)) {
        return;
      }

      const condition = relationCondition(
        attribute.target,
        reachAt(filtersSchema, reach, path.attribute),
        joinPath(basePath, path.attribute)
      );

      if (condition === undefined) {
        return;
      }

      set(key, { $and: [toRelationWhere(value), condition, { id: { $notNull: true } }] });
      inserted.push(`${path.raw}.$and[1]`);
    };

    return traverseQueryFilters(visitor, { schema: filtersSchema, getModel }, filters);
  };

  /**
   * The caller's filters (the root's, or a populate node's) restricted to what they may read
   * through relations: negations of restricted relations match nothing, where objects holding a
   * restricted relation are split, then each restricted relation key gets its condition.
   */
  const conditionRelationFilters = async (
    filters: unknown,
    filtersSchema: Model,
    reach: JoinReach,
    basePath?: string
  ): Promise<unknown> => {
    if (Array.isArray(filters)) {
      return Promise.all(
        filters.map((item) => conditionRelationFilters(item, filtersSchema, reach, basePath))
      );
    }

    if (!isPlainObject(filters)) {
      return filters;
    }

    const denied = await denyNegatedRestrictedRelations(filters, filtersSchema, reach);
    const { value: split } = splitWhere(denied, filtersSchema, reach);

    return wrapRestrictedRelations(split, filtersSchema, reach, basePath);
  };

  /**
   * Drops every sort through a relation to a restricted type, then the relation keys that are
   * left with nothing to sort on (`folder.notes.title` would otherwise become `folder`).
   */
  const dropRestrictedSorts = async (
    sort: unknown,
    sortSchema: Model,
    reach: JoinReach
  ): Promise<unknown> => {
    let dropped = false;

    const dropRestricted: Visitor = ({ key, attribute, path }, { remove }) => {
      if (
        isRelationTo(attribute) &&
        isRestricted(attribute.target, reachAt(sortSchema, reach, path.attribute))
      ) {
        dropped = true;
        narrowed(
          sortSchema.uid as string,
          'sort',
          'sort-dropped',
          path.attribute,
          attribute.target as string
        );
        remove(key);
      }
    };

    const removeEmptyRelations: Visitor = ({ key, attribute, value }, { remove }) => {
      if (attribute && !isScalarAttribute(attribute) && isEmpty(value)) {
        remove(key);
      }
    };

    const options = { schema: sortSchema, getModel };
    const result = await traverseQuerySort(dropRestricted, options, sort);

    return dropped ? traverseQuerySort(removeEmptyRelations, options, result) : result;
  };

  /**
   * A populate node's options with its relation filters conditioned, its restricted sorts dropped,
   * its nested `populate` conditioned and, when given, its own condition ANDed into its filters.
   *
   * The options are read by name, as the query params converter reads them: the
   * populate traversal takes `populate` for an attribute when the target has an attribute of that
   * name, and would never walk the nested populate then.
   */
  const conditionNode = async (
    node: Populated,
    target: Model | undefined,
    reach: JoinReach,
    nodePath: string | undefined,
    condition?: Filters
  ): Promise<Populated> => {
    const next = { ...node };

    if (target !== undefined && next.filters !== undefined && next.filters !== null) {
      next.filters = await conditionRelationFilters(next.filters, target, reach, nodePath);
    }

    if (target !== undefined && hasSort(next.sort)) {
      const sort = await dropRestrictedSorts(next.sort, target, reach);

      if (hasSort(sort)) {
        next.sort = sort;
      } else {
        delete next.sort;
      }
    }

    if (target !== undefined && next.populate !== undefined && next.populate !== null) {
      next.populate = await conditionPopulateTree(next.populate, target, reach, nodePath);
    }

    if (condition !== undefined) {
      next.filters = and(next.filters, condition);
    }

    return next;
  };

  /**
   * The fragments of a morph relation or a dynamic zone (`on`, read by name), each a node of its
   * type. The query layer loads every type listed in a morph `on`, whatever its value, so a morph
   * fragment of a restricted type always gets the condition.
   */
  const conditionFragments = async (
    on: Populated,
    reach: JoinReach,
    nodePath: string | undefined,
    isMorph: boolean
  ): Promise<Populated> => {
    const next: Populated = {};

    for (const [uid, fragment] of Object.entries(on)) {
      const fragmentPath = joinPath(nodePath, uid);
      const condition = isMorph ? relationCondition(uid, 'populate', fragmentPath) : undefined;

      if (isPlainObject(fragment)) {
        const model = getModel(uid);

        // eslint-disable-next-line no-await-in-loop
        next[uid] = await conditionNode(
          fragment as Populated,
          model,
          reachOf(model, reach),
          fragmentPath,
          condition
        );
      } else {
        next[uid] = condition === undefined ? fragment : { filters: condition };
      }
    }

    return next;
  };

  /**
   * First populate pass, on the keys of one populate map: the forms the query params converter
   * reads differently from the traversal become forms both read alike. `*` is expanded, and a
   * dynamic zone's nested `populate` becomes one `on` fragment per component holding it: the query
   * layer loads every component with it, unfiltered (`morphToMany`, `init(on?.[type] ??
   * typePopulate)`). That is `populate: '*'` (every relation of every component) and a dotted path
   * through the zone (`blocks.tags`, which the traversal reads as `{ blocks: { populate: { tags:
   * true } } }` and the converter passes on as a string). Comma lists are split before the pass.
   * Nested maps get their own passes through {@link conditionNode}.
   */
  const normalizePopulate: Visitor = (options, utils) => {
    if (options.parent !== undefined) {
      return;
    }

    expandWildcardPopulate(options, utils);

    const { key, value, attribute } = options;

    if (
      attribute?.type === 'dynamiczone' &&
      isPlainObject(value) &&
      (value as Populated).populate != null &&
      (value as Populated).on == null
    ) {
      const components: string[] = attribute.components ?? [];
      const { populate } = value as Populated;

      utils.set(key, {
        ...omit(value as Populated, 'populate'),
        on: Object.fromEntries(components.map((uid) => [uid, { populate: cloneDeep(populate) }])),
      });
    }
  };

  /**
   * Second populate pass, on the keys of one populate map whose rows have `reach`: conditions each
   * node. Nested maps and fragments are conditioned by name through {@link conditionNode} and
   * {@link conditionFragments}, so the visits the traversal makes below this map are skipped.
   */
  const conditionPopulate =
    (reach: JoinReach): Visitor =>
    async ({ key, value, attribute, parent, path, schema }, { set, remove }) => {
      if (parent !== undefined || !attribute) {
        return;
      }

      const nodePath = path.attribute ?? undefined;

      if (isMorphToRelationalAttribute(attribute)) {
        if (value === false || (isString(value) && !populates(value))) {
          return;
        }

        const node = value as Populated;

        if (!isPlainObject(value) || !isPlainObject(node.on)) {
          // No `on` to attach conditions to: the query layer would load every related entry
          // unfiltered. sanitize.query's stock step has already turned true and counts into `on`
          narrowed(schema.uid as string, 'populate', 'populate-removed', nodePath);
          remove(key);

          return;
        }

        // The query layer counts a morph relation's links without filtering them, so a restricted
        // type is left out of the count rather than counted unfiltered
        const on = populates(node.count)
          ? pickBy(node.on as Populated, (_, uid) => {
              const restricted = isRestricted(uid, 'populate');

              if (restricted) {
                narrowed(schema.uid as string, 'populate', 'morph-left-out', nodePath, uid);
              }

              return !restricted;
            })
          : (node.on as Populated);

        set(key, { ...node, on: await conditionFragments(on, reach, nodePath, true) });

        return;
      }

      if (attribute.type === 'dynamiczone') {
        const node = value as Populated;

        if (isPlainObject(value) && isPlainObject(node.on)) {
          set(key, {
            ...node,
            on: await conditionFragments(node.on as Populated, reach, nodePath, false),
          });
        }

        return;
      }

      if (isRelationTo(attribute)) {
        const { target } = attribute;

        if (isPlainObject(value)) {
          const condition = relationCondition(target, 'populate', nodePath);
          const model = getModel(target);

          set(
            key,
            await conditionNode(
              value as Populated,
              model,
              reachOf(model, reach),
              nodePath,
              condition
            )
          );

          return;
        }

        if (value === true || (isString(value) && populates(value))) {
          const condition = relationCondition(target, 'populate', nodePath);

          if (condition !== undefined) {
            set(key, { filters: condition });
          }

          return;
        }

        if (value !== false && !isString(value) && isRestricted(target, 'populate')) {
          // A value the converter can't read and a condition can't be attached to
          narrowed(schema.uid as string, 'populate', 'populate-removed', nodePath, target);
          remove(key);
        }

        return;
      }

      if ((attribute.type === 'component' || attribute.type === 'media') && isPlainObject(value)) {
        const target = getModel(attribute.type === 'component' ? attribute.component : FILE_UID);

        set(key, await conditionNode(value as Populated, target, reachOf(target, reach), nodePath));
      }
    };

  const removeUnreadable = removeRestrictedRelations(auth, (entry) => checker.record(auth, entry));

  /**
   * Between the two passes: core's stock relation-scope check (`removeRestrictedRelations`, the
   * caller must hold the target's `find`) over the normalised map. The stock step of
   * `sanitize.query` runs before this one, and its traversal walks a dynamic zone's `on` fragments
   * only, so what a zone's nested `populate`, `'*'` or a dotted path reaches is checked here, once
   * {@link normalizePopulate} has made it `on` fragments. Elsewhere it decides what the
   * stock step already decided.
   *
   * A morph value without `on` is left to the second pass, which removes it (fail closed): the
   * stock visitor would turn it into fragments of every type the caller may read.
   */
  const removeUnreadableRelations: Visitor = (options, utils) => {
    const { attribute, value } = options;

    if (
      attribute !== undefined &&
      isMorphToRelationalAttribute(attribute) &&
      !(isPlainObject(value) && isPlainObject((value as Populated).on))
    ) {
      return;
    }

    return removeUnreadable(options, utils);
  };

  /**
   * Normalises, scope-checks, then conditions one populate map: the root's, or a node's
   * `populate`
   */
  const conditionPopulateTree = async (
    populate: unknown,
    treeSchema: Model,
    reach: JoinReach,
    basePath?: string
  ): Promise<unknown> => {
    const options = {
      schema: treeSchema,
      getModel,
      path: { raw: basePath ?? null, attribute: basePath ?? null },
    };
    const normalized = await traverseQueryPopulate(
      normalizePopulate,
      options,
      splitPopulatePaths(populate)
    );
    const readable = await traverseQueryPopulate(removeUnreadableRelations, options, normalized);

    return traverseQueryPopulate(conditionPopulate(reach), options, readable);
  };

  const result = { ...query };

  if (stripsRoot) {
    // A published read: the key is kept, as the Document Service reads a missing status as draft
    if (requested.status) {
      result.status = 'published';
    }

    delete result.hasPublishedVersion;
    delete result.publicationFilter;

    checker.record(auth, { kind: 'draft-status-removed', uid: schema.uid });
  }

  // Root filters: the caller's, with their relation filters conditioned, ANDed with the root's
  // condition and, when a read reads the root's drafts, its read-drafts filters
  const rootCondition = both(
    conditionFor(queryActionFor(action), schema.uid, 'root'),
    gatesRoot && readsDrafts(read) ? conditionFor('read-drafts', schema.uid, 'root') : undefined
  );
  const hasFilters = result.filters !== undefined && result.filters !== null;

  if (hasFilters && !isPlainObject(result.filters) && !Array.isArray(result.filters)) {
    throw invalidFilters();
  }

  // Outside a draft read, the root's rows are published versions, or have no versions
  const rootReach = reachOf(schema, 'unversioned');
  const filters = hasFilters
    ? await conditionRelationFilters(result.filters, schema, rootReach)
    : result.filters;

  if (rootCondition !== undefined) {
    result.filters = and(filters, rootCondition);
  } else if (hasFilters) {
    result.filters = filters;
  }

  if (hasSort(result.sort)) {
    const sort = await dropRestrictedSorts(result.sort, schema, rootReach);

    if (hasSort(sort)) {
      result.sort = sort;
    } else {
      delete result.sort;
    }
  }

  if (result.populate !== undefined && result.populate !== null) {
    result.populate = await conditionPopulateTree(result.populate, schema, rootReach);
  }

  return result;
};

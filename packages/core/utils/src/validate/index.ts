import { CurriedFunction1, has, isObject, isPlainObject } from 'lodash';
import type { z } from 'zod/v4';

import {
  getNonWritableAttributes,
  constants,
  isMorphToRelationalAttribute,
} from '../content-types';
import { ALLOWED_QUERY_PARAM_KEYS } from '../content-api-constants';
import {
  type RouteLike,
  getExtraQueryKeysFromRoute,
  getExtraRootKeysFromRouteBody,
} from '../content-api-route-params';
import { pipe as pipeAsync } from '../async';
import { throwInvalidKey } from './utils';

import * as visitors from './visitors';
import * as validators from './validators';
import traverseEntity from '../traverse-entity';

import { traverseQueryFilters, traverseQueryPopulate, traverseQuerySort } from '../traverse';
import type { Path } from '../traverse/factory';

import type { Model, Data, Entry } from '../types';
import { ValidationError } from '../errors';
import { validatePublicationFilterQueryParam } from '../publication-filter';
import {
  createRelationRestriction,
  readActionFor,
  type PermissionChecker,
} from '../content-api-permissions';
import { canSearchText, resolveMatchedGroups, type EntryMatcher } from '../field-rules';
import {
  createDraftReadPermission,
  createDraftRelationRestriction,
  createJoinWalk,
  draftReadOf,
  draftsReach,
  isWriteAction,
  joinPathOf,
  joinsDrafts,
  reachOf,
  type DraftRead,
  type JoinReach,
} from '../content-api-drafts';
import { assertDraftAccess } from './drafts-gate';
import { assertPopulateDepth, splitPopulateLists } from './populate-depth';

/**
 * Whether reading a type (by uid) through a relation is restricted for the caller, the relation
 * being the visited key at `path`
 */
type RelationRestriction = (uid: string, path?: Path) => boolean;

/**
 * The restriction of the relations a filters or sort traversal visits, started at rows of `base`
 * with `reach`; the visited paths start with `prefix` (a populate node's path) when given
 */
type RestrictionAt = (base: Model, reach: JoinReach, prefix?: string | null) => RelationRestriction;

const { ID_ATTRIBUTE, DOC_ID_ATTRIBUTE } = constants;

export interface Options {
  auth?: unknown;
  /**
   * If true, validateQuery throws when the query has any top-level key not in the allowed list.
   * Defaults to false for backward compatibility.
   */
  strictParams?: boolean;
  /**
   * When set, extra query/input params are derived from the route's request schema (and validated with Zod).
   * When absent, no extra params are allowed in strict mode.
   */
  route?: RouteLike;
  /**
   * The data action the request runs: `find`, `findOne`, `create`, `update`, … (for core
   * controllers, the name of the route's handler). Input rules use `create` / `update`; the root
   * of a query uses `queryActionFor(action)`. The drafts gate skips the root of `create`, `update`
   * and `delete`, and checks the types they reach.
   */
  action?: string;
  /**
   * Set when a write routed as `update` also creates an entry: a single type's first document, or
   * a new locale of a document. A key the create stamp sets is refused on top of the update's
   * locked fields.
   */
  creates?: boolean;
  /**
   * The document id of the entry an `update` writes. With several conditional field groups it says
   * which ones the entry matches, so the body is held to that entry's fields; without it the
   * fields every group has are the writable ones.
   */
  documentId?: string;
  /** The locale the request writes, `'*'` for several. None is the default locale */
  locale?: string;
}

/** What registry validators are called with, besides the schema */
export type ValidatorOptions = Pick<Options, 'auth' | 'action'>;

/**
 * A validator registered through `strapi.validators.add`. It receives `{ auth, action }` when it
 * declares parameters; a curried one (lodash's `curry`, whose `length` is 0) gets the schema alone.
 */
export interface Validator {
  (schema: Model, options?: ValidatorOptions): CurriedFunction1<Entry, Promise<Entry>>;
}

/**
 * Calls a registry validator for a schema. A curried `(schema, data) => …` would run at once on a
 * second argument, taking the options for its data, so a function that declares no parameters gets
 * the schema alone, as before the options existed.
 */
const callRegistered = (validator: Validator, schema: Model, options: ValidatorOptions) =>
  validator.length > 0 ? validator(schema, options) : validator(schema);
export interface ValidateFunc {
  (data: unknown, schema: Model, options?: Options): Promise<void>;
}

export type ValidateQueryParamHandler = (
  value: unknown,
  schema: Model,
  options?: Options
) => Promise<void>;

export type ValidateBodyParamHandler = (
  value: unknown,
  schema: Model,
  options?: Options
) => Promise<void>;

export interface APIOptions {
  validators?: Validators;
  getModel: (model: string) => Model;
  /** The Content API permission checker. Its subject-aware steps run only when it is active */
  permissions?: PermissionChecker;
  /** Which entries match a filter, for the fields of conditioned rows (`@strapi/core` provides it) */
  matchEntries?: EntryMatcher;
}

export interface Validators {
  input?: Validator[];
}

const createAPIValidators = (opts: APIOptions) => {
  const { getModel } = opts || {};

  /** The checker when the caller's ability carries data rules; the field rules ask nothing else */
  const activeChecker = (auth: unknown): PermissionChecker | null =>
    auth && opts?.permissions?.isActive(auth) ? opts.permissions : null;

  /**
   * Whether reading a type through a relation is restricted for this caller, each uid asked once:
   * null when the checker is not active (it is asked nothing else then). Make one per request.
   *
   * The caller's `read-drafts` filter on a draft-and-publish type restricts too where a filter or
   * sort joins its drafts: everywhere when the query reads drafts with its `status`, and otherwise
   * where the rows it is joined from link to drafts (`joinsDrafts`: from a type without draft &
   * publish, at any depth), as `sanitize.query` restricts them there.
   */
  const relationRestrictionFor = (auth: unknown, read?: DraftRead): RestrictionAt | null => {
    if (!auth || !opts?.permissions?.isActive(auth)) {
      return null;
    }

    const restriction = createRelationRestriction(opts.permissions, auth);
    const drafts = createDraftRelationRestriction(opts.permissions, auth, getModel);

    if (read !== undefined && draftsReach(read, 'filter')) {
      return () => (uid) => restriction(uid) || drafts(uid);
    }

    const walk = createJoinWalk(getModel, createDraftReadPermission(opts.permissions, auth));

    return (base, reach, prefix) => (uid, path) => {
      if (restriction(uid)) {
        return true;
      }

      const from = walk({ model: base, reach }, joinPathOf(path?.attribute, prefix));

      return joinsDrafts(from.reach, getModel(uid)) && drafts(uid);
    };
  };

  /**
   * Refuses, in every populate node (relations, components, media, and the fragments of dynamic
   * zones and morph relations), a sort through a relation to a type the caller's data rules
   * restrict and a filter on such a relation under a `$not`, as `validateSort` and
   * `validateFilters` do at the root. Error paths start at the node.
   *
   * A node's options (`sort`, `filters`, `populate`, `on`) are read by name, as the query params
   * converter reads them: the populate traversal takes a key for an attribute when the target has
   * an attribute of that name, and would not walk a nested `populate` or `on` then.
   */
  const throwConditionedPopulateNodes = (restrictionAt: RestrictionAt, schema: Model) => {
    /** A populate map of rows of `treeSchema`, whose reach is `reach` */
    const checkTree = async (
      populate: unknown,
      treeSchema: Model,
      reach: JoinReach,
      basePath?: Path
    ) => {
      await traverseQueryPopulate(
        async ({ value, attribute, parent, path }) => {
          // Nested nodes are reached by name through checkNode
          if (parent !== undefined || !attribute) {
            return;
          }

          if (attribute.type === 'dynamiczone' || isMorphToRelationalAttribute(attribute)) {
            const node = isPlainObject(value) ? (value as Record<string, unknown>) : {};

            if (isPlainObject(node.on)) {
              for (const [uid, fragment] of Object.entries(node.on as Record<string, unknown>)) {
                // eslint-disable-next-line no-await-in-loop
                await checkNode(fragment, getModel(uid), reach, path);
              }
            }

            // The query layer loads every component of a zone with its nested `populate`, as
            // `sanitize.query` reads it (one `on` fragment per component). The stock populate
            // validator refuses any but `'*'` before this runs; this keeps the walks alike
            if (
              attribute.type === 'dynamiczone' &&
              node.populate !== undefined &&
              node.populate !== null
            ) {
              for (const component of attribute.components ?? []) {
                const componentSchema = getModel(component);

                if (componentSchema !== undefined) {
                  // eslint-disable-next-line no-await-in-loop
                  await checkTree(node.populate, componentSchema, reach, path);
                }
              }
            }

            return;
          }

          let target: string | undefined;

          if (attribute.type === 'relation' && typeof attribute.target === 'string') {
            target = attribute.target;
          } else if (attribute.type === 'component') {
            target = attribute.component;
          } else if (attribute.type === 'media') {
            target = 'plugin::upload.file';
          }

          if (target !== undefined) {
            await checkNode(value, getModel(target), reach, path);
          }
        },
        { schema: treeSchema, getModel, path: basePath },
        populate
      );
    };

    /** A node of `target`, below rows whose reach is `parentReach` */
    const checkNode = async (
      node: unknown,
      target: Model | undefined,
      parentReach: JoinReach,
      path: Path
    ) => {
      if (!isPlainObject(node) || target === undefined) {
        return;
      }

      const { sort, filters, populate } = node as Record<string, unknown>;
      const reach = reachOf(target, parentReach);
      const isRestricted = restrictionAt(target, reach, path.attribute);

      if (sort !== undefined && sort !== null) {
        await traverseQuerySort(
          visitors.throwConditionedRelationSort(isRestricted),
          {
            schema: target,
            getModel,
            path: { raw: `${path.raw}.sort`, attribute: path.attribute },
          },
          sort
        );
      }

      if (filters !== undefined && filters !== null) {
        // `raw` restarts at the filters, so only their own `$not` keys count
        await traverseQueryFilters(
          visitors.throwConditionedRelationUnderNot(isRestricted),
          { schema: target, getModel, path: { raw: null, attribute: path.attribute } },
          filters
        );
      }

      if (populate !== undefined && populate !== null) {
        await checkTree(populate, target, reach, path);
      }
    };

    return async (populate: unknown) => {
      await checkTree(populate, schema, reachOf(schema, 'unversioned'));

      return populate;
    };
  };

  const validateInput: ValidateFunc = async (data: unknown, schema: Model, options = {}) => {
    const { auth, route, action, creates, documentId, locale } = options;
    if (!schema) {
      throw new Error('Missing schema in validateInput');
    }

    if (Array.isArray(data)) {
      await Promise.all(data.map((entry) => validateInput(entry, schema, options)));
      return;
    }

    const allowedExtraRootKeys = getExtraRootKeysFromRouteBody(route);

    const nonWritableAttributes = getNonWritableAttributes(schema);

    const transforms = [
      (data: unknown) => {
        if (isObject(data)) {
          if (ID_ATTRIBUTE in data) {
            throwInvalidKey({ key: ID_ATTRIBUTE });
          }

          if (DOC_ID_ATTRIBUTE in data) {
            throwInvalidKey({ key: DOC_ID_ATTRIBUTE });
          }
        }
        return data;
      },
      // What the server sets on a create (the owner) and what an update may not change: the same
      // 400 naming the field for every caller, before the relation checks give another reason
      (data: unknown) => {
        if (auth && opts?.permissions?.isActive(auth) && isPlainObject(data)) {
          const { permissions: checker } = opts;
          const body = data as Record<string, unknown>;

          if (action === 'create' || creates) {
            for (const key of Object.keys(checker.stampFor(auth, schema.uid))) {
              if (Object.prototype.hasOwnProperty.call(body, key)) {
                throwInvalidKey({ key, reason: 'it is set by the server' });
              }
            }
          }

          if (action === 'update') {
            for (const key of checker.lockedFields(auth, schema.uid)) {
              if (has(body, key)) {
                throwInvalidKey({ key, reason: 'it can not be changed' });
              }
            }
          }
        }

        return data;
      },
      // non-writable attributes
      traverseEntity(visitors.throwRestrictedFields(nonWritableAttributes), { schema, getModel }),
      // unrecognized attributes (allowedExtraRootKeys = registered input param keys)
      traverseEntity(visitors.throwUnrecognizedFields, {
        schema,
        getModel,
        allowedExtraRootKeys,
      }),
    ];

    // what the caller's field rules don't let this write set (the create or update list); the keys
    // of the create stamp were refused above
    const fieldChecker = action === 'create' || action === 'update' ? activeChecker(auth) : null;

    if (fieldChecker) {
      (transforms as Array<(data: unknown) => unknown>).push(async (value: unknown) => {
        if (!isPlainObject(value)) {
          return value;
        }

        const matched =
          action === 'update'
            ? await resolveMatchedGroups({
                checker: fieldChecker,
                auth,
                schema,
                documentId,
                matcher: opts.matchEntries,
                locale,
                creates,
              })
            : undefined;

        return traverseEntity(
          visitors.throwUnauthorizedFields(fieldChecker, auth, action as string, {
            creates,
            matched,
            // Refused above, with a reason of their own
            stampKeys: [],
          }),
          { schema, getModel },
          value as Data
        );
      });
    }

    if (auth) {
      // restricted relations
      transforms.push(
        traverseEntity(visitors.throwRestrictedRelations(auth), {
          schema,
          getModel,
        })
      );
    }

    // Apply validators from registry if exists
    opts?.validators?.input?.forEach((validator: Validator) =>
      transforms.push(callRegistered(validator, schema, { auth, action }))
    );

    try {
      await pipeAsync(...transforms)(data as Data);

      // Validate extra root keys from route's body schema with Zod (throw on failure).
      //
      // Content-api sends the document payload as body.data; the controller calls validateInput(body.data, ctx),
      // so the input we receive here is the inner payload (keys like "relatedMedia", "name"), not the full body.
      // The route's body schema is z.object({ data: ... }), so its shape includes "data". We skip "data" because
      // the main document payload is already validated above by traverseEntity (throwUnrecognizedFields, etc.);
      // relation ops (connect/disconnect/set) are handled there, not by the route's Zod schema. We only run
      // Zod here for truly extra root keys added via addInputParams (e.g. clientMutationId).
      if (isObject(data) && route?.request?.body?.['application/json']) {
        const bodySchema = route.request.body['application/json'];
        if (typeof bodySchema === 'object' && 'shape' in bodySchema) {
          const shape = (bodySchema as { shape: Record<string, z.ZodTypeAny> }).shape;
          const dataObj = data as Record<string, unknown>;
          for (const key of Object.keys(shape)) {
            if (key === 'data' || !(key in dataObj)) continue;
            const zodSchema = shape[key];
            if (zodSchema && typeof (zodSchema as z.ZodTypeAny).parse === 'function') {
              const result = (zodSchema as z.ZodTypeAny).safeParse(dataObj[key]);
              if (!result.success) {
                throw new ValidationError(
                  (result.error?.message as string) ?? 'Validation failed',
                  { key, path: null, source: 'body', param: key }
                );
              }
            }
          }
        }
      }
    } catch (e) {
      if (e instanceof ValidationError) {
        e.details.source = 'body';
      }
      throw e;
    }
  };

  const validateQuery = async (
    query: Record<string, unknown>,
    schema: Model,
    { auth, strictParams = false, route, action }: Options = {}
  ) => {
    if (!schema) {
      throw new Error('Missing schema in validateQuery');
    }

    // Core allowlisted params are not covered by route.request.query Zod (see getExtraQueryKeysFromRoute).
    if ('publicationFilter' in query) {
      validatePublicationFilterQueryParam(query.publicationFilter);
    }

    if (strictParams) {
      const extraQueryKeys = getExtraQueryKeysFromRoute(route);
      const allowedKeys = new Set([...ALLOWED_QUERY_PARAM_KEYS, ...extraQueryKeys]);
      for (const key of Object.keys(query)) {
        if (!allowedKeys.has(key)) {
          try {
            throwInvalidKey({ key, path: null });
          } catch (e) {
            if (e instanceof ValidationError) {
              e.details.source = 'query';
              e.details.param = key;
            }
            throw e;
          }
        }
      }
      // Validate extra query keys from route's request schema with Zod (throw on failure)
      const routeQuerySchema = route?.request?.query;
      if (routeQuerySchema) {
        for (const key of extraQueryKeys) {
          if (key in query) {
            const zodSchema = routeQuerySchema[key];
            if (zodSchema && typeof (zodSchema as z.ZodTypeAny).parse === 'function') {
              const result = (zodSchema as z.ZodTypeAny).safeParse(query[key]);
              if (!result.success) {
                throw new ValidationError(
                  (result.error?.message as string) ?? 'Invalid query param',
                  { key, path: null, source: 'query', param: key }
                );
              }
            }
          }
        }
      }
    }

    // Reading drafts needs read-drafts (403 DRAFT_READ_FORBIDDEN). The root of a write is exempt:
    // its status says what it writes, and it returns what it wrote. The types a write
    // reaches through populate, filters and sorts are not
    if (auth && opts?.permissions) {
      await assertDraftAccess(query, schema, {
        auth,
        checker: opts.permissions,
        getModel,
        skipRoot: isWriteAction(action),
      });
    }

    // A text search matches on fields no filter names: only for a caller who may query them all
    const checker = activeChecker(auth);

    if (checker && '_q' in query && !canSearchText(checker, auth, action, schema)) {
      throw new ValidationError('Invalid key _q: searching by text is not allowed', {
        key: '_q',
        path: null,
        source: 'query',
        param: '_q',
      });
    }

    const { filters, sort, fields, populate } = query;

    // Asked once per related type for the whole query
    const restrictionAt = relationRestrictionFor(auth, draftReadOf(query));

    if (filters) {
      await validateFiltersAt(filters, schema, { auth, action }, restrictionAt);
    }

    if (sort) {
      await validateSortAt(sort, schema, { auth, action }, restrictionAt);
    }

    if (fields) {
      await validateFields(fields, schema, { auth, action });
    }

    // a wildcard is always valid; its conversion will be handled by the entity service and can be optimized with sanitizer
    if (populate && populate !== '*') {
      await validatePopulateAt(populate, schema, { auth, action }, restrictionAt);
    }

    // How deep the caller's rows let a populate go: `*` is a level, so a wildcard counts too
    if (populate && checker) {
      assertPopulateDepth(populate, schema, { auth, action, checker, getModel });
    }
  };

  const validateFiltersAt = async (
    filters: unknown,
    schema: Model,
    { auth, action }: Options = {},
    restrictionAt: RestrictionAt | null = relationRestrictionFor(auth)
  ): Promise<void> => {
    if (!schema) {
      throw new Error('Missing schema in validateFilters');
    }
    if (Array.isArray(filters)) {
      await Promise.all(
        filters.map((filter) => validateFiltersAt(filter, schema, { auth, action }, restrictionAt))
      );
      return;
    }

    const transforms = [validators.defaultValidateFilters({ schema, getModel })];

    if (auth) {
      transforms.push(
        traverseQueryFilters(visitors.throwRestrictedRelations(auth), {
          schema,
          getModel,
        })
      );
    }

    // A filter on a field the caller's rules hide would tell them its value
    const checker = activeChecker(auth);

    if (checker) {
      transforms.push(
        traverseQueryFilters(
          visitors.throwUnauthorizedFields(checker, auth, readActionFor(action)),
          { schema, getModel }
        )
      );
    }

    // A filter on a relation to a type the caller's data rules restrict, under a `$not`
    if (restrictionAt) {
      const isRestricted = restrictionAt(schema, reachOf(schema, 'unversioned'));

      transforms.push(
        traverseQueryFilters(visitors.throwConditionedRelationUnderNot(isRestricted), {
          schema,
          getModel,
        })
      );
    }

    try {
      await pipeAsync(...transforms)(filters);
    } catch (e) {
      if (e instanceof ValidationError) {
        e.details.source = 'query';
        e.details.param = 'filters';
      }
      throw e;
    }
  };

  const validateSortAt = async (
    sort: unknown,
    schema: Model,
    { auth, action }: Options = {},
    restrictionAt: RestrictionAt | null = relationRestrictionFor(auth)
  ): Promise<void> => {
    if (!schema) {
      throw new Error('Missing schema in validateSort');
    }
    const transforms = [validators.defaultValidateSort({ schema, getModel })];

    if (auth) {
      transforms.push(
        traverseQuerySort(visitors.throwRestrictedRelations(auth), {
          schema,
          getModel,
        })
      );
    }

    // So does an ordering by one
    const checker = activeChecker(auth);

    if (checker) {
      transforms.push(
        traverseQuerySort(visitors.throwUnauthorizedFields(checker, auth, readActionFor(action)), {
          schema,
          getModel,
        })
      );
    }

    // A sort through a relation to a type the caller's data rules restrict
    if (restrictionAt) {
      const isRestricted = restrictionAt(schema, reachOf(schema, 'unversioned'));

      transforms.push(
        traverseQuerySort(visitors.throwConditionedRelationSort(isRestricted), {
          schema,
          getModel,
        })
      );
    }

    try {
      await pipeAsync(...transforms)(sort);
    } catch (e) {
      if (e instanceof ValidationError) {
        e.details.source = 'query';
        e.details.param = 'sort';
      }
      throw e;
    }
  };

  const validateFields: ValidateFunc = async (fields, schema: Model) => {
    if (!schema) {
      throw new Error('Missing schema in validateFields');
    }
    const transforms = [validators.defaultValidateFields({ schema, getModel })];

    try {
      await pipeAsync(...transforms)(fields);
    } catch (e) {
      if (e instanceof ValidationError) {
        e.details.source = 'query';
        e.details.param = 'fields';
      }
      throw e;
    }
  };

  const validatePopulateAt = async (
    populate: unknown,
    schema: Model,
    { auth, action }: Options = {},
    restrictionAt: RestrictionAt | null = relationRestrictionFor(auth)
  ): Promise<void> => {
    if (!schema) {
      throw new Error('Missing schema in sanitizePopulate');
    }
    // Relations the caller's rules hide can't be populated, and the filters and sort of a
    // populate node read by the target's own fields
    const checker = activeChecker(auth);

    // Comma lists checked path by path, as the Document Service populates them
    const checked = checker ? splitPopulateLists(populate) : populate;

    const transforms = [validators.defaultValidatePopulate({ schema, getModel })];

    if (checker) {
      transforms.push(
        traverseQueryPopulate(
          visitors.throwUnauthorizedFields(checker, auth, readActionFor(action), { nodes: true }),
          { schema, getModel }
        )
      );
    }

    if (restrictionAt) {
      transforms.push(throwConditionedPopulateNodes(restrictionAt, schema));
    }

    try {
      await pipeAsync(...transforms)(checked);
    } catch (e) {
      if (e instanceof ValidationError) {
        e.details.source = 'query';
        e.details.param = 'populate';
      }
      throw e;
    }
  };

  // The public signatures stay `(data, schema, options)`. The restriction a whole query shares is
  // an internal parameter of the `At` variants, which validateQuery calls directly.
  const validateFilters: ValidateFunc = (filters, schema, options) =>
    validateFiltersAt(filters, schema, options);
  const validateSort: ValidateFunc = (sort, schema, options) =>
    validateSortAt(sort, schema, options);
  const validatePopulate: ValidateFunc = (populate, schema, options) =>
    validatePopulateAt(populate, schema, options);

  return {
    input: validateInput,
    query: validateQuery,
    filters: validateFilters,
    sort: validateSort,
    fields: validateFields,
    populate: validatePopulate,
  };
};

export { createAPIValidators, validators, visitors, assertDraftAccess };

export type APIValidators = ReturnType<typeof createAPIValidators>;

import { CurriedFunction1, cloneDeep, isPlainObject, omit, pick } from 'lodash';
import type { z } from 'zod/v4';

import { constants, getNonWritableAttributes } from '../content-types';
import { ALLOWED_QUERY_PARAM_KEYS } from '../content-api-constants';
import {
  type RouteLike,
  getExtraQueryKeysFromRoute,
  getExtraRootKeysFromRouteBody,
} from '../content-api-route-params';
import { pipe as pipeAsync } from '../async';

import * as visitors from './visitors';
import * as sanitizers from './sanitizers';
import traverseEntity from '../traverse-entity';

import { traverseQueryFilters, traverseQuerySort, traverseQueryPopulate } from '../traverse';
import type { Model, Data, Entry } from '../types';
import { validatePublicationFilterQueryParam } from '../publication-filter';
import { hasSort } from '../sort-query';
import {
  readActionFor,
  type ExplainEntry,
  type PermissionChecker,
} from '../content-api-permissions';
import {
  canSearchText,
  resolveEntryFields,
  resolveMatchedGroups,
  type EntryFields,
  type EntryMatcher,
} from '../field-rules';
import { applyConditions } from './apply-conditions';
import { splitPopulateLists } from '../validate/populate-depth';

export interface Options {
  auth?: unknown;
  /**
   * If true, removes fields that are not declared in the schema (input) or keeps only allowed query param keys (query).
   * Defaults to false for backward compatibility.
   * TODO: In Strapi 6, strictParams will default to true (and may be removed as an option)
   */
  strictParams?: boolean;
  /**
   * When set, extra query/input params are derived from the route's request schema (and validated/sanitized with Zod).
   * When absent, no extra params are allowed in strict mode.
   */
  route?: RouteLike;
  /**
   * The data action the request runs: `find`, `findOne`, `create`, `update`, … (for core
   * controllers, the name of the route's handler). Input rules use `create` / `update`; output
   * rules use `readActionFor(action)`; the root of a query uses `queryActionFor(action)` (`update`
   * and `delete` narrow by their own rules, reads by the read action's).
   */
  action?: string;
  /**
   * Set when a write routed as `update` also creates an entry: a single type's first document, or
   * a new locale of a document. The create stamp (set owner) is applied on top of the update's
   * locked fields.
   */
  creates?: boolean;
  /**
   * The document id of the entry an `update` writes. With several conditional field groups it says
   * which ones the entry matches, so the body is held to that entry's fields; without it the
   * fields every group has are the writable ones.
   */
  documentId?: string;
  /**
   * For output: the status the request reads or writes, resolved (published for a read that names
   * none). Entries of a draft & publish type say which version they are with `publishedAt`, which
   * the `fields` param can drop: this is the root's answer then. Without it such an entry is
   * unplaced, and the conditional field groups grant it nothing.
   */
  status?: 'draft' | 'published';
  /**
   * The locale the request reads or writes: for output, resolved (the default locale for a request
   * that names none) and `'*'` for several, which places no entry; for an update's input, as the
   * request names it, none being the default locale. Output entries of a localized type say theirs
   * with `locale`, which `fields` can drop: this is the root's answer then.
   */
  locale?: string;
  /**
   * For output: nothing in the data is known to have matched the caller's read filter, because the
   * route found it in its own code (the `me` routes), so every conditional field group is checked
   * against the entry.
   */
  unfiltered?: boolean;
}

/** What registry sanitizers are called with, besides the schema */
export type SanitizerOptions = Pick<Options, 'auth' | 'action'>;

/**
 * A sanitizer registered through `strapi.sanitizers.add`. It receives `{ auth, action }` when it
 * declares parameters; a curried one (lodash's `curry`, whose `length` is 0) gets the schema alone.
 */
export interface Sanitizer {
  (schema: Model, options?: SanitizerOptions): CurriedFunction1<Entry, Promise<Entry>>;
}

/**
 * Calls a registry sanitizer for a schema. A curried `(schema, data) => …` (users-permissions
 * registers one) would run at once on a second argument, taking the options for its data, so a
 * function that declares no parameters gets the schema alone, as before the options existed.
 */
const callRegistered = (sanitizer: Sanitizer, schema: Model, options: SanitizerOptions) =>
  sanitizer.length > 0 ? sanitizer(schema, options) : sanitizer(schema);
export interface SanitizeFunc {
  (data: unknown, schema: Model, options?: Options): Promise<unknown>;
}

export type SanitizeQueryParamHandler = (
  value: unknown,
  schema: Model,
  options?: Options
) => Promise<unknown>;

export type SanitizeBodyParamHandler = (
  value: unknown,
  schema: Model,
  options?: Options
) => Promise<unknown>;

export interface APIOptions {
  sanitizers?: Sanitizers;
  getModel: (model: string) => Model;
  /** The Content API permission checker. Its subject-aware steps run only when it is active */
  permissions?: PermissionChecker;
  /** Which entries match a filter, for the fields of conditioned rows (`@strapi/core` provides it) */
  matchEntries?: EntryMatcher;
}

export interface Sanitizers {
  input?: Sanitizer[];
  output?: Sanitizer[];
}

const createAPISanitizers = (opts: APIOptions) => {
  const { getModel } = opts;

  /** The checker when the caller's ability carries data rules; the field rules ask nothing else */
  const activeChecker = (auth: unknown): PermissionChecker | null =>
    auth && opts.permissions?.isActive(auth) ? opts.permissions : null;

  /** Tells the checker which relations the scope check takes out, for an active caller only */
  const relationRemoved = (auth: unknown) => {
    const checker = activeChecker(auth);

    return checker ? (entry: ExplainEntry) => checker.record(auth, entry) : undefined;
  };

  const sanitizeInput: SanitizeFunc = (
    data: unknown,
    schema: Model,
    { auth, strictParams = false, route, action, creates, documentId, locale } = {}
  ) => {
    if (!schema) {
      throw new Error('Missing schema in sanitizeInput');
    }
    if (Array.isArray(data)) {
      return Promise.all(
        data.map((entry) =>
          sanitizeInput(entry, schema, {
            auth,
            strictParams,
            route,
            action,
            creates,
            documentId,
            locale,
          })
        )
      );
    }

    const allowedExtraRootKeys = getExtraRootKeysFromRouteBody(route);

    const nonWritableAttributes = getNonWritableAttributes(schema);

    const transforms = [
      // Remove first level ID in inputs
      (value: Record<string, unknown>) => omit(value, constants.ID_ATTRIBUTE),
      (value: Record<string, unknown>) => omit(value, constants.DOC_ID_ATTRIBUTE),
      // Remove non-writable attributes
      traverseEntity(visitors.removeRestrictedFields(nonWritableAttributes), { schema, getModel }),
    ];

    if (strictParams) {
      // Remove unrecognized fields (allowedExtraRootKeys = registered input param keys)
      transforms.push(
        traverseEntity(visitors.removeUnrecognizedFields, {
          schema,
          getModel,
          allowedExtraRootKeys,
        })
      );
    }

    // The create stamp, asked of the checker once for the field rules and the merge below
    let stamp: Record<string, unknown> | undefined;
    const stampOf = (checker: PermissionChecker) => {
      stamp ??= checker.stampFor(auth, schema.uid);

      return stamp;
    };

    // Remove what the caller's field rules don't let this write set (the create or update list).
    // The keys of the create stamp stay: the stamp is merged last, and validation refuses them
    const fieldChecker = action === 'create' || action === 'update' ? activeChecker(auth) : null;

    if (fieldChecker) {
      (transforms as Array<(data: Entry) => Entry | Promise<Entry>>).push(async (value) => {
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
          visitors.removeUnauthorizedFields(fieldChecker, auth, action as string, {
            creates,
            matched,
            stampKeys: action === 'create' || creates ? Object.keys(stampOf(fieldChecker)) : [],
          }),
          { schema, getModel },
          value
        );
      });
    }

    if (auth) {
      // Remove restricted relations
      transforms.push(
        traverseEntity(visitors.removeRestrictedRelations(auth, relationRemoved(auth)), {
          schema,
          getModel,
        })
      );
    }

    // Apply sanitizers from registry if exists
    opts?.sanitizers?.input?.forEach((sanitizer: Sanitizer) =>
      transforms.push(callRegistered(sanitizer, schema, { auth, action }))
    );

    /**
     * For each extra root key from the route's body schema present in data, run Zod safeParse.
     * If parsing fails, the key is removed from the output.
     *
     * Content-api sends the document payload as body.data; the controller calls sanitizeInput(body.data, ctx),
     * so the input we receive here is the inner payload (keys like "relatedMedia", "name"), not the full body.
     * The route's body schema is z.object({ data: ... }), so its shape includes "data". We skip "data" because
     * the main document payload is already sanitized above by traverseEntity (removeUnrecognizedFields, etc.);
     * relation ops (connect/disconnect/set) are handled there, not by the route's Zod schema. We only run
     * Zod here for truly extra root keys added via addInputParams (e.g. clientMutationId).
     */
    const routeBodySanitizeTransform = async (data: Data): Promise<Data> => {
      if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
      const obj = data as Record<string, unknown>;
      const bodySchema = route?.request?.body?.['application/json'];
      if (bodySchema && typeof bodySchema === 'object' && 'shape' in bodySchema) {
        const shape = (bodySchema as { shape: Record<string, z.ZodTypeAny> }).shape;
        for (const key of Object.keys(shape)) {
          if (key === 'data' || !(key in obj)) continue;
          const zodSchema = shape[key];
          if (zodSchema && typeof (zodSchema as z.ZodTypeAny).safeParse === 'function') {
            const result = (zodSchema as z.ZodTypeAny).safeParse(obj[key]);
            if (result.success) {
              obj[key] = result.data;
            } else {
              delete obj[key];
            }
          }
        }
      }
      return data;
    };
    (transforms as Array<(data: Data) => Data | Promise<Data>>).push(routeBodySanitizeTransform);

    // The last step, after every other: the stamp is forced data that no rule above may strip, and
    // nothing below it can put a locked field back. Subject-aware callers only: it asks an
    // inactive checker nothing else.
    if (auth && opts.permissions?.isActive(auth)) {
      const checker = opts.permissions;

      (transforms as Array<(data: Data) => Data | Promise<Data>>).push((value) => {
        if (!isPlainObject(value)) {
          return value;
        }

        let result: Data = value;

        // An update keeps its locked fields as they are (an owner can't hand the entry away)
        if (action === 'update') {
          const locked = checker.lockedFields(auth, schema.uid);

          if (locked.length > 0) {
            result = omit(result, locked) as Data;
          }
        }

        // A create is forced to carry the owner, whatever the body says
        if (action === 'create' || creates) {
          result = { ...result, ...stampOf(checker) } as Data;
        }

        return result;
      });
    }

    return pipeAsync(...transforms)(data as Data);
  };

  /** One entry, or each entry of a list, with the fields of every entry of the response worked out */
  const sanitizeEntries = async (
    data: unknown,
    schema: Model,
    { auth, action }: Options,
    entries?: EntryFields
  ): Promise<unknown> => {
    if (Array.isArray(data)) {
      const res: unknown[] = Array.from({ length: data.length });
      for (let i = 0; i < data.length; i += 1) {
        res[i] = await sanitizeEntries(data[i], schema, { auth, action }, entries);
      }
      return res;
    }

    const transforms = [
      (data: Data) => sanitizers.defaultSanitizeOutput({ schema, getModel }, data),
    ];

    if (auth) {
      transforms.push(
        traverseEntity(visitors.removeRestrictedRelations(auth, relationRemoved(auth)), {
          schema,
          getModel,
        })
      );
    }

    // Remove the fields the caller's rules hide from each entry: a write response reads by
    // `findOne`, a populated relation's target by its own `find` fields
    const checker = entries ? activeChecker(auth) : null;

    if (checker && entries) {
      transforms.push(
        traverseEntity(
          visitors.removeUnauthorizedFields(checker, auth, readActionFor(action), { entries }),
          { schema, getModel }
        )
      );
    }

    // Apply sanitizers from registry if exists
    opts?.sanitizers?.output?.forEach((sanitizer: Sanitizer) =>
      transforms.push(callRegistered(sanitizer, schema, { auth, action }))
    );

    return pipeAsync(...transforms)(data as Data);
  };

  const sanitizeOutput: SanitizeFunc = async (
    data,
    schema: Model,
    { auth, action, status, locale, unfiltered } = {}
  ) => {
    if (!schema) {
      throw new Error('Missing schema in sanitizeOutput');
    }

    // Which conditional field groups each entry of the response matches: once for the whole
    // response, a list included
    const checker = data !== null && typeof data === 'object' ? activeChecker(auth) : null;
    const entries = checker
      ? await resolveEntryFields({
          checker,
          auth,
          action,
          data,
          schema,
          getModel,
          matcher: opts.matchEntries,
          status,
          locale,
          unfiltered,
        })
      : undefined;

    return sanitizeEntries(data, schema, { auth, action }, entries);
  };

  const sanitizeQuery = async (
    query: Record<string, unknown>,
    schema: Model,
    { auth, strictParams = false, route, action }: Options = {}
  ) => {
    if (!schema) {
      throw new Error('Missing schema in sanitizeQuery');
    }
    const { filters, sort, fields, populate } = query;

    const sanitizedQuery = cloneDeep(query);

    if ('publicationFilter' in sanitizedQuery) {
      validatePublicationFilterQueryParam(sanitizedQuery.publicationFilter);
    }

    if (filters) {
      Object.assign(sanitizedQuery, {
        filters: await sanitizeFilters(filters, schema, { auth, action }),
      });
    }

    if (hasSort(sort)) {
      Object.assign(sanitizedQuery, { sort: await sanitizeSort(sort, schema, { auth, action }) });
    } else if ('sort' in sanitizedQuery) {
      delete sanitizedQuery.sort;
    }

    if (fields) {
      Object.assign(sanitizedQuery, {
        fields: await sanitizeFields(fields, schema, { auth, action }),
      });
    }

    if (populate) {
      Object.assign(sanitizedQuery, {
        populate: await sanitizePopulate(populate, schema, { auth, action }),
      });
    }

    const extraQueryKeys = getExtraQueryKeysFromRoute(route);
    const routeQuerySchema = route?.request?.query;
    if (routeQuerySchema) {
      for (const key of extraQueryKeys) {
        if (key in query) {
          const zodSchema = routeQuerySchema[key];
          if (zodSchema && typeof (zodSchema as z.ZodTypeAny).safeParse === 'function') {
            const result = (zodSchema as z.ZodTypeAny).safeParse(query[key]);
            if (result.success) {
              sanitizedQuery[key] = result.data;
            } else {
              delete sanitizedQuery[key];
            }
          }
        }
      }
    }

    let output = sanitizedQuery;

    if (strictParams) {
      const allowedKeys = [...ALLOWED_QUERY_PARAM_KEYS, ...extraQueryKeys];
      output = pick(sanitizedQuery, allowedKeys) as Record<string, unknown>;
    }

    // A text search matches on fields no filter names: only for a caller who may query them all
    const checker = activeChecker(auth);

    if (checker && '_q' in output && !canSearchText(checker, auth, action, schema)) {
      delete output._q;
    }

    // Last, after every stock step: the condition filters it adds are never sanitized (a
    // sanitizer would drop private fields and empty lists from them), and
    // removeRestrictedRelations can't strip them. It asks an inactive checker nothing else.
    if (opts.permissions) {
      return applyConditions(output, schema, {
        auth,
        action,
        checker: opts.permissions,
        getModel,
      });
    }

    return output;
  };

  const sanitizeFilters: SanitizeFunc = (filters, schema: Model, { auth, action } = {}) => {
    if (!schema) {
      throw new Error('Missing schema in sanitizeFilters');
    }
    if (Array.isArray(filters)) {
      return Promise.all(
        filters.map((filter) => sanitizeFilters(filter, schema, { auth, action }))
      );
    }

    const transforms = [sanitizers.defaultSanitizeFilters({ schema, getModel })];

    if (auth) {
      transforms.push(
        traverseQueryFilters(visitors.removeRestrictedRelations(auth, relationRemoved(auth)), {
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
          visitors.removeUnauthorizedFields(checker, auth, readActionFor(action)),
          { schema, getModel }
        )
      );
    }

    return pipeAsync(...transforms)(filters);
  };

  const sanitizeSort: SanitizeFunc = (sort, schema: Model, { auth, action } = {}) => {
    if (!schema) {
      throw new Error('Missing schema in sanitizeSort');
    }
    const transforms = [sanitizers.defaultSanitizeSort({ schema, getModel })];

    if (auth) {
      transforms.push(
        traverseQuerySort(visitors.removeRestrictedRelations(auth, relationRemoved(auth)), {
          schema,
          getModel,
        })
      );
    }

    // So does an ordering by one
    const checker = activeChecker(auth);

    if (checker) {
      transforms.push(
        traverseQuerySort(visitors.removeUnauthorizedFields(checker, auth, readActionFor(action)), {
          schema,
          getModel,
        })
      );
    }

    return pipeAsync(...transforms)(sort);
  };

  const sanitizeFields: SanitizeFunc = (fields, schema: Model) => {
    if (!schema) {
      throw new Error('Missing schema in sanitizeFields');
    }
    const transforms = [sanitizers.defaultSanitizeFields({ schema, getModel })];

    return pipeAsync(...transforms)(fields);
  };

  const sanitizePopulate: SanitizeFunc = (populate, schema: Model, { auth, action } = {}) => {
    if (!schema) {
      throw new Error('Missing schema in sanitizePopulate');
    }

    // Comma lists sanitized path by path, as the Document Service populates them: the checks below
    // must see each path, not one key named `a,b`. Subject-aware callers only
    const checker = activeChecker(auth);
    const sanitized = checker ? splitPopulateLists(populate) : populate;

    const transforms = [sanitizers.defaultSanitizePopulate({ schema, getModel })];

    if (auth) {
      transforms.push(
        traverseQueryPopulate(visitors.removeRestrictedRelations(auth, relationRemoved(auth)), {
          schema,
          getModel,
        })
      );
    }

    // Relations the caller's rules hide aren't populated, and the filters and sort of a populate
    // node read by the target's own fields
    if (checker) {
      transforms.push(
        traverseQueryPopulate(
          visitors.removeUnauthorizedFields(checker, auth, readActionFor(action), { nodes: true }),
          { schema, getModel }
        )
      );
    }

    return pipeAsync(...transforms)(sanitized);
  };

  return {
    input: sanitizeInput,
    output: sanitizeOutput,
    query: sanitizeQuery,
    filters: sanitizeFilters,
    sort: sanitizeSort,
    fields: sanitizeFields,
    populate: sanitizePopulate,
  };
};

export { createAPISanitizers, sanitizers, visitors };

export type APISanitiers = ReturnType<typeof createAPISanitizers>;

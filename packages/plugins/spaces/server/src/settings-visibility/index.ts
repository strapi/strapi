import { AsyncLocalStorage } from 'async_hooks';
import type { Core } from '@strapi/types';
import _ from 'lodash';

/**
 * Reusable building blocks for the "settings visibility binding" pattern.
 *
 * Every settings resource (locales, API tokens, transfer tokens, webhooks, etc.) that
 * should be defined once and made visible in N spaces follows the same three-step
 * recipe:
 *
 *   1. Register-time: inject a hidden `spaces` (manyToMany) relation onto the resource's
 *      content type via `injectVisibilityRelation`. Empty list = platform-wide = visible
 *      in every space.
 *   2. Bootstrap-time: wrap the resource's create/update controller via
 *      `wrapControllerForVisibility` so a `spaces: string[]` field on the request body
 *      is extracted (before the host plugin's validation strips it as unknown), the
 *      original controller runs, then the M2M link rows are written. Zero changes to
 *      the host plugin's controller code.
 *   3. Bootstrap-time: wrap the resource's read methods via `scopeReadByCurrentSpace`
 *      so the Content Manager / runtime consumers only see rows visible in the active
 *      space. The settings page opts out with `?scope=all` (or by passing an explicit
 *      filter) — the wrapper recognizes the request query and acts as a passthrough.
 *
 * All three helpers are no-ops when their target plugin/CT isn't registered, so each
 * integration stays drop-in optional.
 */

const SPACES_CT_UID = 'plugin::spaces.space';
const SCOPE_ALL_QUERY_KEY = 'scope';
const SCOPE_ALL_VALUE = 'all';

/* -------------------------------------------------------------------------- */
/*                       Unscoped read bypass (AsyncLocalStorage)             */
/* -------------------------------------------------------------------------- */

/**
 * Code paths that legitimately need to enumerate *every* row regardless of the
 * caller's active space — e.g. i18n's `syncSuperAdminPermissionsWithLocales`,
 * which mirrors all locale codes onto the super-admin's permission entries — wrap
 * their work in `runUnscoped(...)`. While the wrapper runs, any `find`/`findByCode`/
 * `count` call on a service patched by `scopeReadByCurrentSpace` skips the
 * visibility filter and returns the global list.
 *
 * Built on `AsyncLocalStorage` so the bypass survives async boundaries (awaited
 * DB queries, hook chains, etc.) without leaking across concurrent requests.
 */
const unscopedStorage = new AsyncLocalStorage<true>();

export const runUnscoped = <T>(fn: () => T | Promise<T>): T | Promise<T> => {
  return unscopedStorage.run(true, fn);
};

const isUnscoped = (): boolean => unscopedStorage.getStore() === true;

/* -------------------------------------------------------------------------- */
/*                          Register-time: CT schema                          */
/* -------------------------------------------------------------------------- */

/**
 * Returns a fresh relation descriptor every call. Strapi mutates attribute metadata
 * (link-table names, inversedBy, etc.) during model registration, so reusing the same
 * object across CTs causes one CT's link table to silently steal another's writes.
 * We learned this the hard way — keep the factory.
 */
const makeSpacesRelation = () => ({
  type: 'relation' as const,
  relation: 'manyToMany' as const,
  target: SPACES_CT_UID,
  writable: true,
  // `private: false` is deliberate. The Strapi content-API sanitizer strips `private`
  // fields from output, and i18n's locale controller pipes its responses through that
  // sanitizer. With `private: true` the populated `spaces` array we attach in
  // `scopeReadByCurrentSpace` was being silently removed before reaching the admin,
  // so the Settings page's chip column and the Edit modal's multi-select couldn't
  // round-trip the binding. The settings resources we apply this pattern to (locales,
  // tokens, webhooks, etc.) don't expose anything sensitive by surfacing their space
  // binding — it's the same information the visibility chips already render.
  private: false,
  configurable: false,
  visible: false,
});

/**
 * Inject the hidden `spaces` M2M relation onto a settings CT. Idempotent. Safe to call
 * before the CT is registered — the function returns silently if the CT isn't loaded
 * yet (the caller's host plugin may be absent).
 */
export const injectVisibilityRelation = (strapi: Core.Strapi, uid: string): void => {
  const ct = strapi.contentTypes[uid as keyof typeof strapi.contentTypes];
  if (!ct) return;
  _.set(ct.attributes, 'spaces', makeSpacesRelation());
};

/* -------------------------------------------------------------------------- */
/*                       Bootstrap-time: write-path patch                     */
/* -------------------------------------------------------------------------- */

interface VisibilityRoute {
  /** HTTP method, uppercase. */
  method: 'POST' | 'PUT' | 'PATCH';
  /** Path regex matched against `ctx.path` (no host, no query). */
  pathRegex: RegExp;
  /**
   * Whether this route can *remove* visibility from spaces (i.e. update). Set on
   * PUT/PATCH so the safety-guard pre-check runs; safe to omit on POST since a
   * brand-new row can't have prior bindings.
   */
  isUpdate?: boolean;
}

/**
 * Pre-write safety check. Called with the list of space slugs being removed from a
 * resource's visibility binding. Return a human-readable error string to reject the
 * write with a 400, or `null` to allow it. The hook owns its own queries and can
 * therefore enforce host-plugin-specific invariants (e.g. "you can't remove the
 * default locale of that space without picking a new one").
 */
type RemovalValidator = (
  strapi: Core.Strapi,
  args: {
    contentTypeUid: string;
    /** The host resource's primary key (from the URL). */
    resourceId: number | string;
    /** Slugs being dropped from the resource's `spaces` binding. */
    removedSlugs: string[];
    /** Full row of the resource being updated (post-update for name/etc., but with the *old* spaces still attached). */
    currentResource: any;
  }
) => Promise<string | null>;

/**
 * Optional post-process hook fired after the host controller successfully creates or
 * updates a resource and after the M2M `spaces` rows have been (re)written. Receives
 * the resource id, the final list of bound space slugs (post-normalization), and a
 * `field` indicating which extra body field is being processed. Today the only field
 * is `defaultIn` (per-space default locales for i18n), but the shape is generic so
 * future resources can plug in their own extras.
 */
type AfterWriteHook = (
  strapi: Core.Strapi,
  args: {
    contentTypeUid: string;
    resourceId: number | string;
    /** Final bound space slugs (after explicit-all normalization). */
    finalSlugs: string[];
    /** Slugs the caller passed in the body for this extra field (untransformed). */
    requestedFor: string[];
    /** Full resource row (post-update) — for callers that need the code/name. */
    resource: any;
  }
) => Promise<void>;

interface ControllerWrapOptions {
  /** UID of the host plugin's resource content type, e.g. `plugin::i18n.locale`. */
  contentTypeUid: string;
  /** Routes whose request body may carry a `spaces` array we should consume. */
  routes: VisibilityRoute[];
  /** Optional safety hook invoked before the M2M write for update routes. */
  validateRemoval?: RemovalValidator;
  /**
   * Optional list of extra body fields to extract & forward to an after-write hook. Each
   * entry is a body-field name that contains an array of space slugs (or anything else
   * shaped like `string[]` and tied to the resource's space binding). The associated
   * `onAfterWrite` is invoked once per field after the M2M write succeeds.
   *
   * Used today for i18n's `defaultIn` (per-space default locale). The shape stays generic
   * so future resources (webhooks, tokens, …) can plug in their own extras without code
   * changes here.
   */
  extraBodyFields?: Array<{
    /** Body field name (e.g. `'defaultIn'`). */
    name: string;
    /** Called after the resource + M2M is written. */
    onAfterWrite: AfterWriteHook;
  }>;
}

/**
 * Register a Koa middleware that intercepts the host plugin's create/update routes,
 * strips `spaces` from the request body *before* the route's Yup validation rejects it
 * as an unknown field, lets the original controller run untouched, then writes the
 * M2M `spaces` link rows on the resulting resource id.
 *
 * Why a Koa middleware and not a controller monkey-patch? `Strapi.bootstrap()` runs
 * `server.initRouting()` *before* the plugin lifecycle hooks. Route composition calls
 * `controller[action].bind(controller)`, so by the time a plugin's `bootstrap()` swaps
 * `controller.createLocale`, the route handler already holds a bound reference to the
 * *original* method — the swap is never observed. Koa middleware registered via
 * `strapi.server.use()` in bootstrap, on the other hand, *is* picked up because the
 * router mounts onto Koa lazily at `listen()` time (well after bootstrap).
 *
 * The resource id is recovered from `ctx.body.data?.id`, `ctx.body.id`, or the
 * documentId fallback — most Strapi controllers shape responses one of these ways.
 */
export const wrapControllerForVisibility = (
  strapi: Core.Strapi,
  {
    contentTypeUid,
    routes,
    validateRemoval,
    extraBodyFields = [],
  }: ControllerWrapOptions
): void => {
  const middleware = async (ctx: any, next: () => Promise<any>) => {
    const matched = routes.find(
      (r) => r.method === ctx.method && r.pathRegex.test(ctx.path)
    );
    if (!matched) return next();

    const body = ctx.request?.body ?? {};
    const spacesSlug: string[] | undefined = Array.isArray(body.spaces) ? body.spaces : undefined;

    // Extract any extra body fields (e.g. i18n's `defaultIn`) before the host plugin's
    // Yup validation strips them as unknown. Keep them in a side-channel and re-apply
    // via the registered `onAfterWrite` hook after the resource + M2M write succeeds.
    const extraValues: Record<string, string[]> = {};
    for (const extra of extraBodyFields) {
      if (Array.isArray(body[extra.name])) {
        extraValues[extra.name] = body[extra.name];
      }
    }

    if (spacesSlug !== undefined || Object.keys(extraValues).length > 0) {
      // Strip both `spaces` and any registered extras off the body. The host plugin's
      // validation (strict: true + .noUnknown) doesn't tolerate unknown fields.
      const { spaces, ...rest } = body;
      for (const extra of extraBodyFields) delete (rest as any)[extra.name];
      ctx.request.body = rest;
    }

    /* ---- Safety guard (update routes only) ----
     * If the route is an update and the new `spaces` removes the resource from spaces
     * where it's still load-bearing, reject with 400 *before* the host controller runs
     * so the resource's other fields aren't half-updated. */
    if (matched.isUpdate && spacesSlug !== undefined && validateRemoval) {
      const resourceId = parseTrailingIdFromPath(ctx.path);
      if (resourceId !== null) {
        const currentResource = await strapi.db.query(contentTypeUid).findOne({
          where: { id: resourceId },
          populate: { spaces: { select: ['slug'] } },
        });
        if (currentResource) {
          const currentSlugs: string[] = (currentResource.spaces ?? []).map(
            (s: any) => s.slug
          );
          // Compute which spaces are *losing* visibility.
          //
          //   - Restricted → restricted: `currentSlugs - new` (the slugs being unchecked).
          //   - Platform-wide (currentSlugs === []) → restricted (new !== []): every
          //     space NOT in `new` was previously implicitly included, so it's being
          //     dropped. We materialize the implicit "all spaces" set here.
          //   - Restricted → platform-wide ([]): widening, nothing removed.
          //   - Platform-wide → platform-wide: no-op.
          //
          // The previous version only handled the first case, which let the user move a
          // platform-wide locale to a restricted set without the safety check ever firing
          // (effective removal from every other space).
          const newSet = new Set(spacesSlug);
          let removedSlugs: string[];
          if (currentSlugs.length === 0) {
            if (spacesSlug.length === 0) {
              removedSlugs = []; // platform-wide → platform-wide; no-op
            } else {
              const allSpaces = await strapi.db
                .query(SPACES_CT_UID)
                .findMany({ select: ['slug'] });
              removedSlugs = allSpaces
                .map((s: any) => s.slug as string)
                .filter((s) => !newSet.has(s));
            }
          } else {
            removedSlugs = currentSlugs.filter((s) => !newSet.has(s));
          }

          if (removedSlugs.length > 0) {
            const error = await validateRemoval(strapi, {
              contentTypeUid,
              resourceId,
              removedSlugs,
              currentResource,
            });
            if (error) {
              ctx.status = 400;
              ctx.body = {
                data: null,
                error: {
                  status: 400,
                  name: 'ValidationError',
                  message: error,
                  details: { removedSlugs },
                },
              };
              return; // short-circuit — host controller never runs
            }
          }
        }
      }
    }

    await next();

    if (ctx.status >= 400) return;
    if (spacesSlug === undefined && Object.keys(extraValues).length === 0) return;

    const resourceId =
      ctx.body?.data?.id ?? ctx.body?.id ?? ctx.body?.data?.documentId ?? undefined;
    if (resourceId === undefined) {
      strapi.log.warn(
        `[spaces] wrapControllerForVisibility(${contentTypeUid}): could not recover the ` +
          `created/updated resource id from the response body for ${ctx.method} ${ctx.path} — ` +
          `skipping space binding. Inspect the controller's response shape.`
      );
      return;
    }

    /* ---- Storage normalization (only when `spaces` is in the body) ----
     * If the user explicitly ticked every available space, store an empty M2M instead
     * (= platform-wide). Matches the chip column's display logic and means future spaces
     * added later automatically inherit, where an explicit-list locale would not. */
    let finalSlugs: string[] = [];
    if (spacesSlug !== undefined) {
      const allSpaces = await strapi.db
        .query(SPACES_CT_UID)
        .findMany({ select: ['id', 'slug'] });
      const allSlugs = new Set(allSpaces.map((s: any) => s.slug));
      const isExplicitAll =
        spacesSlug.length === allSlugs.size && spacesSlug.every((s) => allSlugs.has(s));
      finalSlugs = isExplicitAll ? [] : spacesSlug;

      const targetIds = allSpaces
        .filter((s: any) => finalSlugs.includes(s.slug))
        .map((s: any) => s.id);

      await strapi.db
        .query(contentTypeUid)
        .update({ where: { id: resourceId }, data: { spaces: targetIds } });
    } else if (extraBodyFields.length > 0) {
      // No `spaces` change but we still need to know the current binding so extras can
      // make sense of it (e.g. `defaultIn` validating against bound spaces).
      const populated = await strapi.db.query(contentTypeUid).findOne({
        where: { id: resourceId },
        populate: { spaces: { select: ['slug'] } },
      });
      finalSlugs = (populated?.spaces ?? []).map((s: any) => s.slug);
    }

    /* ---- Extras (`defaultIn`, etc.) ---- */
    if (extraBodyFields.length > 0) {
      const populatedResource = await strapi.db.query(contentTypeUid).findOne({
        where: { id: resourceId },
        populate: { spaces: { select: ['slug'] } },
      });
      for (const extra of extraBodyFields) {
        const requested = extraValues[extra.name];
        if (!Array.isArray(requested)) continue;
        try {
          await extra.onAfterWrite(strapi, {
            contentTypeUid,
            resourceId,
            finalSlugs,
            requestedFor: requested,
            resource: populatedResource,
          });
        } catch (err) {
          strapi.log.warn(
            `[spaces] after-write hook for ${contentTypeUid}.${extra.name} failed: ${(err as Error).message}`
          );
        }
      }
    }
  };

  strapi.server.use(middleware as any);
};

/** Extract the trailing path segment as a numeric id (e.g. `/i18n/locales/42` → 42). */
const parseTrailingIdFromPath = (path: string): number | null => {
  const match = path.match(/\/([^/]+)\/?$/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
};

/* -------------------------------------------------------------------------- */
/*                        Bootstrap-time: read-path patch                     */
/* -------------------------------------------------------------------------- */

const getCurrentSpaceSlug = (strapi: Core.Strapi): string | undefined =>
  strapi.requestContext.get()?.state?.spaceSlug as string | undefined;

const isScopeAllRequest = (strapi: Core.Strapi): boolean => {
  const ctx = strapi.requestContext.get();
  const q = ctx?.request?.query as Record<string, unknown> | undefined;
  return q?.[SCOPE_ALL_QUERY_KEY] === SCOPE_ALL_VALUE;
};

/**
 * The visibility predicate: a row is visible in the active space if its `spaces` M2M
 * relation lists the active space, OR its `spaces` is empty (= platform-wide).
 */
const visibilityFilter = (spaceSlug: string) => ({
  $or: [
    { spaces: { slug: spaceSlug } },
    { spaces: { id: { $null: true } } }, // no matching link rows → empty M2M
  ],
});

/**
 * Wrap a service's read methods so each call:
 *   - Restricts the `where` clause to rows visible in the current space (or platform-wide
 *     rows). Passthrough when there's no active space (CLI, bootstrap) or when
 *     `?scope=all` is in the request query.
 *   - Auto-populates the `spaces` relation on the result so admin consumers can render
 *     the visibility chips/multi-select without having to know to pass `populate`
 *     themselves. Host plugin controllers that call the service with no params don't
 *     need to be modified.
 *
 * `methods` lists the property names on `service` to wrap. Each must take `(params, ...rest)`
 * where `params` is a `where`-like object (Strapi's i18n `find`/`count` use this shape).
 * Methods with different shapes (e.g. `findByCode(code: string)`) should be re-implemented
 * via the wrapped `find` instead of being passed here.
 *
 * The wrapper is intentionally specific to i18n's locales-service shape today — when we
 * extend to API tokens / webhooks the shape may differ and we'll generalize.
 */
export const scopeReadByCurrentSpace = (
  strapi: Core.Strapi,
  service: any,
  methods: string[]
): void => {
  if (!service) return;

  for (const methodName of methods) {
    if (typeof service[methodName] !== 'function') continue;
    const original = service[methodName].bind(service);

    service[methodName] = async (params: any = {}, ...rest: any[]) => {
      // First, apply the space visibility filter — unless the caller asked to bypass
      // it (either via `?scope=all` on an admin HTTP request, or by running inside a
      // `runUnscoped(...)` block, used by i18n's internal permission-sync code paths
      // that legitimately need the full locale list).
      let where = params;
      if (!isUnscoped() && !isScopeAllRequest(strapi)) {
        const spaceSlug = getCurrentSpaceSlug(strapi);
        if (spaceSlug) {
          const filter = visibilityFilter(spaceSlug);
          where = params && Object.keys(params).length ? { $and: [params, filter] } : filter;
        }
      }

      const result = await original(where, ...rest);

      // Then, populate `spaces` on the result(s). The host service's `find` ignores any
      // `populate` we might pass alongside `where`, so we hit `strapi.db.query` directly
      // for the relation and merge it onto each row. Only does extra work for `find`-shaped
      // methods that return rows with an `id`; bails out otherwise.
      const rows: any[] = Array.isArray(result) ? result : result ? [result] : [];
      if (rows.length === 0 || rows[0]?.id == null) return result;

      const ids = rows.map((r) => r.id);
      const withSpaces = await strapi.db.query(getModelUidFromService(service)).findMany({
        where: { id: { $in: ids } },
        populate: { spaces: { select: ['id', 'slug', 'name', 'color'] } },
        select: ['id'],
      });
      const spacesById = new Map(
        withSpaces.map((row: any) => [row.id, row.spaces ?? []])
      );
      for (const row of rows) {
        row.spaces = spacesById.get(row.id) ?? [];
      }
      return result;
    };
  }
};

/**
 * Recover the host content-type uid from a service object. The Strapi convention is
 * that services expose their model uid implicitly through their factory closure — we
 * don't have a clean way to ask, so we attach it as a side-channel via a Symbol when
 * the wrapper is set up. Callers of `scopeReadByCurrentSpace` should mark the service
 * with `attachServiceContentType(service, uid)` before wrapping.
 */
const SERVICE_CT_SYMBOL = Symbol.for('@strapi/plugin-spaces/service-ct-uid');
const getModelUidFromService = (service: any): string => service[SERVICE_CT_SYMBOL];
export const attachServiceContentType = (service: any, contentTypeUid: string) => {
  if (service) service[SERVICE_CT_SYMBOL] = contentTypeUid;
};

/* -------------------------------------------------------------------------- */
/*                                  Exports                                   */
/* -------------------------------------------------------------------------- */

export { visibilityFilter, SCOPE_ALL_QUERY_KEY, SCOPE_ALL_VALUE };

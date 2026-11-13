import type { Ability } from '@casl/ability';
import { engine } from '@strapi/permissions';
import { providerFactory, sanitize, validate } from '@strapi/utils';
import type {
  DATA_ABILITY as DATA_ABILITY_KEY,
  ExplainEntry,
  PermissionChecker,
} from '@strapi/utils';
import type { z } from 'zod/v4';

import type { Route } from '../core';
import type * as UID from '../uid';

/** Base Zod scalar types allowed for query params (no nested objects). */
type ZodScalarSchema = z.ZodString | z.ZodNumber | z.ZodBoolean | z.ZodEnum<Record<string, string>>;

/**
 * Allowed Zod schema types for addQueryParams: scalars (string, number, boolean, enum) or arrays of scalars.
 * Optional and default wrappers are allowed. Nested objects are not allowed for query params.
 */
export type ZodQueryParamSchema =
  | ZodScalarSchema
  | z.ZodOptional<ZodScalarSchema | z.ZodArray<ZodScalarSchema>>
  | z.ZodDefault<ZodScalarSchema | z.ZodArray<ZodScalarSchema>>
  | z.ZodArray<ZodScalarSchema>;

/** Zod namespace Strapi passes into `schema` factory callbacks. */
export type ZodSchemaFactory = typeof z;

/** Schema + optional matchRoute for one query param. Keys in addQueryParams are the param names. */
export type QueryParamEntry = {
  /** Zod schema or factory. Prefer `(z) => schema` so the app does not import Zod. Must be scalar or array of scalars (no nested objects). */
  schema: ZodQueryParamSchema | ((z: ZodSchemaFactory) => ZodQueryParamSchema);
  /** If provided, the param is only merged into routes for which this returns true. */
  matchRoute?: (route: Route) => boolean;
};

/** Schema + optional matchRoute for one input param (root-level body.data). Keys in addInputParams are the param names. */
export type InputParamEntry = {
  /** Zod schema or factory. Prefer `(z) => schema` so the app does not import Zod. Any Zod type allowed (scalars, objects, arrays). */
  schema: z.ZodType | ((z: ZodSchemaFactory) => z.ZodType);
  /** If provided, the param is only merged into routes for which this returns true. */
  matchRoute?: (route: Route) => boolean;
};

/** Options for addQueryParams: keys are param names, values are schema + optional matchRoute. */
export type AddQueryParamsOptions = Record<string, QueryParamEntry>;

/** Options for addInputParams: keys are param names, values are schema + optional matchRoute. */
export type AddInputParamsOptions = Record<string, InputParamEntry>;

/** @deprecated The condition provider registers {@link ContentApiConditionDefinition}s */
export interface Condition {
  name: string;
  [key: string]: unknown;
}

/**
 * The Content API conditions registry. `register` rejects a duplicate name, a malformed definition,
 * and any registration once Strapi has loaded. `get` takes a condition as a permission row names it
 * and gives the definition with the row's params bound, or undefined for a name nobody registered.
 */
export type ConditionProvider = Omit<
  ReturnType<typeof providerFactory>,
  'register' | 'get' | 'values'
> & {
  register: (definition: ContentApiConditionDefinition) => Promise<void>;
  get: (ref: ConditionRef) => BoundCondition | undefined;
  values: () => ContentApiConditionDefinition[];
};

type ActionProvider = {
  register: (action: string, payload: Record<string, unknown>) => Promise<void>;
} & ReturnType<typeof providerFactory>;

/**
 * The key under which an ability built by {@link PermissionUtilities.generateAbility} carries its
 * {@link CompiledPermissions}. Declared here for typing only: the runtime value is `DATA_ABILITY`
 * from `@strapi/utils` (`Symbol.for('strapi.content-api.data-ability')`), and this is its type.
 */
export declare const DATA_ABILITY: typeof DATA_ABILITY_KEY;

/**
 * A Content API permission as a role holds it: what `generateAbility` accepts.
 *
 * Action-only rows (`{ action }`) are what API tokens and Users & Permissions send; they only open
 * routes. A row whose subject is the content type of its action also gives data rules: fields,
 * locales, populate depth and conditions.
 */
export interface ContentApiPermission {
  /** A registered action: `api::article.article.find`, `api::article.article.read-drafts` */
  action: string;
  /** The content type uid. When null or missing, the content type whose controller owns the action */
  subject?: string | null;
  properties?: {
    /** The fields the rule covers; null or missing for every field. An empty list grants nothing */
    fields?: string[] | null;
    locales?: string[] | null;
    populateDepth?: number | null;
  };
  /** Several conditions on one row are ORed */
  conditions?: Array<{ name: string; params?: Record<string, unknown> }>;
  /** Where the row comes from, for explain output. The engine ignores it */
  origin?: { role?: string };
}

/** Who conditions are evaluated for: `$user.<attribute>` placeholders read this object. */
export interface ConditionUser {
  uid: string;
  id: number;
  documentId: string;
  roles: Array<{ documentId: string; name?: string; type?: string }>;
  /**
   * The user's profile, for `$profile.<attribute>` and `$profile.<relation>.documentId`: its public
   * attributes, and its to-one relations as `{ documentId }`. `null` when the user has none. Absent
   * when no registered condition reads the profile (see `conditions.readsProfile`).
   *
   * Trust: a condition that decides on a profile value is only as trustworthy as who can write that
   * value. A role that may `create` or `update` the profile type (the default Authenticated role
   * may update its own, with no field list) lets its users change the data a `$profile.*` condition
   * reads. Grant the write on those fields only to who should decide them.
   */
  profile?: Record<string, unknown> | null;
  [attribute: string]: unknown;
}

/** What a condition's `query`, `stamp` and `lockedFields` are called with. */
export interface ConditionContext {
  /** null for Public */
  user: ConditionUser | null;
  /** The params the permission row binds, with the declared defaults filled in */
  params: Record<string, unknown>;
  /** The content type the permission is on */
  uid: string;
  now: Date;
}

/** A param a condition declares. An `attribute` param names an attribute of the subject */
export interface ContentApiConditionParam {
  type: 'string' | 'number' | 'boolean' | 'attribute';
  required?: boolean;
  default?: unknown;
  /** For an `attribute` param: the uid the relation it names must target */
  relationTarget?: string;
}

/**
 * A Content API condition: a Strapi filter that narrows a permission to some entries.
 *
 * `query` may use placeholders as whole string values: `$user.documentId`, `$user.email`,
 * `$user.roles.documentId`, `$user.<attribute>`, `$now`, `$params.<name>`. Conditions match on
 * `documentId`, never on numeric `id`, so `$user.id` is not a placeholder. A placeholder that
 * can't be resolved (no user, a missing attribute) makes the condition false.
 */
export interface ContentApiConditionDefinition {
  /** 'plugin::end-users.is-owner', 'api::shared-notes' */
  name: string;
  displayName: string;
  /** The content types it applies to. Default: every uid */
  subjects?: string[] | ((uid: string) => boolean);
  params?: Record<string, ContentApiConditionParam>;
  /**
   * A filter, or a function giving one; `true` for no restriction, `false` to deny. A static `{}`
   * is refused at registration and a function's `{}` is false: only `true` is unrestricted. An
   * `$or` or `$and` that comes out empty (a list built from data that has none) is refused too, and
   * denies the row: return `true` or `false` to say that instead. It must be synchronous: a promise
   * (an `async` function) denies, and so does a throw (logged once per condition).
   */
  query: Record<string, unknown> | ((ctx: ConditionContext) => Record<string, unknown> | boolean);
  /**
   * Data forced on create (set owner): an object, or null for none. A condition that declares a
   * `stamp` is false for Public, since a stamp writes the caller into the data and Public has no
   * one to write. Anything else than an object or null denies the row, and so does a throw (logged
   * once per condition). Like `query`, it must be pure and synchronous: it runs when the caller's
   * ability is built and again when the checker answers.
   */
  stamp?: (ctx: ConditionContext) => Record<string, unknown> | null;
  /**
   * Fields not writable on update through this condition: a list of field names. Anything else
   * denies the row, and so does a throw (logged once per condition). Like `query`, it must be pure
   * and synchronous: it runs when the caller's ability is built and again when the checker answers.
   */
  lockedFields?: (ctx: ConditionContext) => string[];
  /**
   * Whether the condition reads the user's profile (`$profile.*` placeholders, or `ctx.user.profile`
   * in a function). Core sets it for a static `query` that holds a `$profile.` placeholder; a
   * definition with a `query` function declares it. A code condition that reads `ctx.user.profile`
   * must set it: otherwise the profile isn't loaded for the request and the value is missing.
   *
   * A condition that reads the profile trusts what is in it: it is only as trustworthy as who can
   * write those profile fields (see {@link ConditionUser.profile}). A user who can write their own
   * profile can change what such a condition sees about them.
   */
  usesProfile?: boolean;
  source?: 'builtin' | 'plugin' | 'code' | 'builder';
}

/** How a permission row names a condition: by name, or by name with the params it binds */
export type ConditionRef = string | { name: string; params?: Record<string, unknown> };

/** A registered condition with a permission row's params bound to it. */
export interface BoundCondition {
  name: string;
  definition: ContentApiConditionDefinition;
  /** The params as the row gives them, before defaults */
  params: Record<string, unknown>;
  /**
   * What the permission engine calls: the filter for `permission.subject`, `true` when it holds
   * without one, `false` when it denies
   */
  handler: (options: {
    user?: ConditionUser | null;
    permission: { subject?: unknown };
  }) => Record<string, unknown> | boolean;
}

/** A {@link ContentApiPermission} whose subject is resolved, with its short (data) action. */
export interface MaterializedPermission {
  /** The full action, as stored: `api::article.article.find` */
  action: string;
  /** The action without its content type: `find`, `read-drafts`, `publish` */
  dataAction: string;
  /** The content type uid */
  subject: string;
  /** null for every field */
  fields: string[] | null;
  locales: string[] | null;
  /** null for no limit */
  populateDepth: number | null;
  conditions: Array<{ name: string; params: Record<string, unknown> }>;
  origin?: { role?: string };
}

/** What an ability built by `generateAbility` carries under {@link DATA_ABILITY}. */
export interface CompiledPermissions {
  /** `can(dataAction, subject, field)`: the data rules, which route checks never read */
  ability: Ability;
  /**
   * Every row the caller holds whose action belongs to a content type, under that content type,
   * whether or not it gave a data rule. A row stored under another content type than its action's
   * is held here too, under its action's content type, where it denies: it is not in `grants`
   */
  rules: MaterializedPermission[];
  /**
   * The rows of `rules` (the same objects) stored under their action's own content type: the only
   * ones that may give a data rule
   */
  grants: MaterializedPermission[];
  user: ConditionUser | null;
}

/** What a caller holds, as `describe` lists it for a front end */
export interface PermissionsDescription {
  /** The route scopes the caller may call: `api::note.note.find` */
  routes: string[];
  /**
   * Per content type and data action, the rows the caller holds, combined across roles: fields are
   * the union (null when any row covers every field), conditions every name used, populateDepth
   * the largest (null when any row has no limit)
   */
  subjects: Record<
    string,
    Record<string, { fields: string[] | null; conditions: string[]; populateDepth: number | null }>
  >;
}

/**
 * The route ability (`can(action)`, as API tokens get it), plus the data rules when it was built
 * by `generateAbility`.
 */
export type ContentApiAbility = Ability & { [DATA_ABILITY]?: CompiledPermissions };

/** The writes checked against the stored entry: the Document Service ignores `filters` on them */
export type EntryAction = 'update' | 'delete' | 'publish';

export interface PermissionUtilities {
  engine: ReturnType<typeof engine.new>;
  providers: {
    /** Actions bound to Content API routes: what API tokens may be granted */
    action: ActionProvider;
    /** `<uid>.read-drafts` and `<uid>.publish` for each content type with draft & publish */
    syntheticAction: ActionProvider;
    condition: ConditionProvider;
  };
  /**
   * What a plugin needs to work with a condition definition it holds, such as a permission
   * editor's: the same checks and answers the registry gives, without registering anything, so
   * all three work after Strapi has loaded.
   */
  conditions: {
    /**
     * The definition as the registry would store it: a validated, deeply frozen copy. Throws an
     * error naming the condition and the problem when `definition` is malformed, a static empty
     * `query` included.
     */
    validate: (definition: unknown) => ContentApiConditionDefinition;
    /**
     * The filter the condition gives for a row's `params` and a sample caller, now: `{}` when it
     * holds without one, or `false` when it denies (no user for a `$user` placeholder, a type
     * outside its `subjects`, a missing required param). Never reads `stamp` or `lockedFields`.
     */
    evaluate: (
      definition: ContentApiConditionDefinition,
      params: Record<string, unknown> | undefined,
      ctx: { user: ConditionUser | null; uid: string }
    ) => Record<string, unknown> | false;
    /** Whether the condition applies to the content type: `subjects` names it, or is absent */
    appliesTo: (definition: ContentApiConditionDefinition, uid: string) => boolean;
    /** Whether any registered condition reads the user's profile, so `ConditionUser.profile` is worth loading */
    readsProfile: () => boolean;
  };
  registerActions: () => Promise<void>;
  getActionsMap: () => Record<
    string,
    {
      controllers: Record<string, string[]>;
    }
  >;
  /**
   * Builds the route ability of these permissions, with their data rules attached under
   * {@link DATA_ABILITY}. API tokens and Users & Permissions keep using `engine.generateAbility`.
   */
  generateAbility: (
    permissions: ContentApiPermission[],
    options: { user: ConditionUser | null }
  ) => Promise<ContentApiAbility>;
  /** Whether `auth.ability` was built by `generateAbility`, and so carries data rules */
  isSubjectAware: (auth: unknown) => boolean;
  /** The content type whose controller owns the action, or null when it isn't a content type's */
  subjectOf: (action: string) => UID.ContentType | null;
  /** What the Content API sanitizers and validators ask about a caller's data rules */
  checker: PermissionChecker;
  /** The route scopes and data rows the caller holds */
  describe: (auth: unknown) => PermissionsDescription;
  /**
   * What the permission checks did to the caller's request so far, for explain mode:
   * the distinct fields, relations and conditions they acted on, with the caller's own roles and the
   * names of the conditions (never their parameters). `checked` is false when nothing asked the
   * caller's rows: a route that skipped the checks has route-level permission only. A caller that
   * is not subject-aware has nothing to explain: `{ checked: false, entryChecked: false, entries: [] }`.
   * `entryChecked` is true once `assertEntry`, `entryMatches` or `assertWritten` ran for the caller's
   * request: the write went through the core controllers' guard, not straight to the Document Service.
   */
  readExplain: (auth: unknown) => {
    checked: boolean;
    entryChecked: boolean;
    entries: ExplainEntry[];
  };
  /**
   * Whether the stored entries a write touches all match the caller's condition filters for
   * (action, uid), in `opts.locale`: the default locale when missing, `'*'` for every locale, or a
   * list of locales. The scope is the one the write itself has, as the Document Service resolves
   * it. `true` at once, with no query, when the ability is not subject-aware. A pair the caller
   * holds no row for is route-level only, except `publish`, which never matches without a row.
   *
   * - `delete` and `publish` check every stored version they touch, the draft and the published one
   *   of a draft & publish type, in every locale in scope: one that doesn't match makes it `false`.
   *   A publish replaces the published version with the draft, so both must be the caller's; a
   *   document with none of its versions in scope is `false`.
   * - `update` checks the drafts of a draft & publish type (the only version of a type without it),
   *   in every locale in scope. A published version is a snapshot: what decides who may update is
   *   the draft.
   * - an `update` of a single locale the document has no entry in creates it from the document's
   *   other drafts, and matches only when every existing draft of the document, in every locale,
   *   matches: the caller must be allowed to write the whole document. Published versions don't
   *   count, and a document with no draft at all is `false`.
   *
   * A `locale` that is not a string, `'*'` or a list of strings is `false`, and so is an `action`
   * other than `update`, `delete` or `publish` (for every caller, a token included).
   */
  entryMatches: (
    auth: unknown,
    action: EntryAction,
    uid: UID.ContentType,
    documentId: string,
    opts?: { locale?: string | string[] }
  ) => Promise<boolean>;
  /**
   * {@link PermissionUtilities.entryMatches}, throwing a `NotFoundError` (404, the answer for an
   * entry that doesn't exist, so a caller can't tell the two apart) when it is `false`. Call it
   * before an update or delete: the Document Service applies no filters to them.
   */
  assertEntry: (
    auth: unknown,
    action: EntryAction,
    uid: UID.ContentType,
    documentId: string,
    opts?: { locale?: string | string[] }
  ) => Promise<void>;
  /**
   * The status a Content API write gets: a caller without `publish` on the type writes a draft,
   * whatever `?status` asks for. Controllers set it as the query's `status` before the query is
   * validated and sanitized (so the drafts gate sees it) and pass it to the service.
   *
   * `status` is `opts.requested` and `publishAfterCreate` is false when the ability is not
   * subject-aware or the type has no draft & publish: what those callers get today. Otherwise it
   * reads `checker.filtersFor(auth, 'publish', uid)`:
   * - a draft is requested, or the caller has no `publish` row (or none of its conditions holds):
   *   `draft`.
   * - `publish` is unconditioned: `requested ?? 'published'`.
   * - `publish` is conditioned: `draft` with `publishAfterCreate`, for a create and an update
   *   alike. Write the draft, then call {@link PermissionUtilities.publishIfAllowed} on its
   *   `documentId` in the same transaction: a create has no entry to match yet, and an update is
   *   judged on the draft as written (a write that changes a condition field must not publish what
   *   the condition forbids) and on the published version it replaces. `documentId` and `locale`
   *   don't change the result.
   *
   * Each draft the caller's rights force is noted for explain mode as `write-as-draft`.
   */
  resolveWriteStatus: (
    auth: unknown,
    uid: UID.ContentType,
    opts: {
      requested?: 'draft' | 'published';
      documentId?: string;
      locale?: string | string[];
    }
  ) => Promise<{ status: 'draft' | 'published' | undefined; publishAfterCreate: boolean }>;
  /**
   * Judges the data a create or update wrote: counts the written version of the document (the
   * written `locale` and `status`; no status on a type without draft & publish) that matches the
   * caller's filters for the action, and throws a `PolicyError` (403, "This change is outside what
   * your role allows.") when none does. Call it inside the transaction that wrote, after the write:
   * the throw rolls the write back, so never catch around the write or around this call. It does
   * nothing for an ability that is not subject-aware, or when the caller's rows for the action
   * carry no entry filter. Deletes are not judged. A write that publishes is judged once per
   * version, `draft` and `published`.
   */
  assertWritten: (
    auth: unknown,
    action: 'create' | 'update',
    uid: UID.ContentType,
    documentId: string,
    scope: { locale?: string; status?: 'draft' | 'published' }
  ) => Promise<void>;
  /**
   * Publishes a document whose draft the caller just wrote (created or updated), when it matches
   * their conditioned `publish` row ({@link PermissionUtilities.entryMatches} for `publish`, in
   * `opts.locale`: the draft as written and the published version it replaces), and says whether
   * it did. Nothing is published, and it is `false`, when the ability is not
   * subject-aware or the type has no draft & publish: such a write had its status resolved as it
   * was requested. A draft that stays one is noted as `write-as-draft`.
   */
  publishIfAllowed: (
    auth: unknown,
    uid: UID.ContentType,
    documentId: string,
    opts?: { locale?: string | string[] }
  ) => Promise<boolean>;
}

export interface ContentApi {
  /** Permissions engine and action/condition providers for the content API. */
  permissions: PermissionUtilities;
  /** Returns a map of scope → {@link Route}[] for all content-api routes. */
  getRoutesMap: () => Promise<Record<string, Route[]>>;
  /** Sanitizers for content-api input. */
  sanitize: sanitize.APISanitiers;
  /** Validators for content-api input. */
  validate: validate.APIValidators;
  /**
   * Register extra query params to be merged into content-api route schemas.
   * Query params accept only Zod scalar or array-of-scalar schemas (no nested objects); enforced at runtime. Use {@link ContentApi.addInputParams} for nested structures.
   * Prefer `schema: (z) => …`. Strapi passes its own Zod into the callback, so apps do not import `zod`, `zod/v4`, or `@strapi/utils`.
   *
   * @example
   * strapi.contentAPI.addQueryParams({
   *   search: {
   *     schema: (z) => z.string().max(200).optional(),
   *   },
   * });
   *
   * @param options - {@link AddQueryParamsOptions}: record of param name → {@link QueryParamEntry}. Each entry has:
   * @param options.[paramName] - {@link QueryParamEntry} (key is the param name, e.g. `"search"`).
   * @param options.[paramName].schema - {@link ZodQueryParamSchema} or `(z: {@link ZodSchemaFactory}) => {@link ZodQueryParamSchema}`. Prefer the factory. Must be scalar or array of scalars. No nested objects.
   * @param options.[paramName].matchRoute - Optional. `(route: {@link Route}) => boolean`; if provided, this param is only added to routes for which it returns true.
   */
  addQueryParams: (options: AddQueryParamsOptions) => void;
  /**
   * Register extra input params (root-level body.data) to be merged into content-api route schemas.
   * Any Zod type is allowed (scalars, objects, arrays). Enforced at runtime.
   * Prefer `schema: (z) => …`. Strapi passes its own Zod into the callback, so apps do not import `zod`, `zod/v4`, or `@strapi/utils`.
   *
   * @example
   * strapi.contentAPI.addInputParams({
   *   clientMutationId: {
   *     schema: (z) => z.string().max(100).optional(),
   *   },
   * });
   *
   * @param options - {@link AddInputParamsOptions}: record of param name → {@link InputParamEntry}. Each entry has:
   * @param options.[paramName] - {@link InputParamEntry} (key is the root-level key in body.data, e.g. `"metadata"`).
   * @param options.[paramName].schema - `z.ZodType` or `(z: {@link ZodSchemaFactory}) => z.ZodType`. Prefer the factory. Any Zod type (e.g. z.object(), z.array(), scalars).
   * @param options.[paramName].matchRoute - Optional. `(route: {@link Route}) => boolean`; if provided, this param is only added to routes for which it returns true.
   */
  addInputParams: (options: AddInputParamsOptions) => void;
  /**
   * Merge all registered extra params into the given routes (mutates in place). Used at route registration.
   *
   * @internal Used by the framework during route registration. Not intended for app or plugin code.
   * @param routes - Array of {@link Route} objects to mutate with registered query/input params.
   */
  applyExtraParamsToRoutes: (routes: Route[]) => void;
}

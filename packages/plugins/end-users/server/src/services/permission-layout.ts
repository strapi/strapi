import { contentTypes as contentTypesUtils, errors } from '@strapi/utils';
import type { Core, Modules, UID } from '@strapi/types';

import { DATA_ACTIONS } from '../../../shared/contracts/permissions';
import type {
  BoundRoute,
  BoundRule,
  LayoutAction,
  LayoutCondition,
  LayoutConditionParam,
  LayoutContentType,
  LayoutField,
  LayoutRoute,
  LayoutRouteGroup,
  PermissionLayout,
} from '../../../shared/contracts/permissions';
import { relationsTo } from '../conditions';
import { PLUGIN_ID, USER_UID } from '../constants';
import { ALWAYS_ALLOWED_SCOPES } from '../strategies/end-users';
import { matchesAccepts } from '../utils/builder/compile';
import { builderConditionOf } from '../utils/builder/registry';
import { paramExtras } from '../utils/builder/usage';
import { ENGINE_OWNED_USER_FIELDS } from '../utils/engine-owned-user-fields';
import { dataActionOf, isEngineType, layoutContentTypeUids } from '../utils/layout-content-types';
import type conditionService from './condition';

type ContentApiConditionDefinition = Modules.ContentAPI.ContentApiConditionDefinition;

type Plain = Record<string, unknown>;

const isPlain = (value: unknown): value is Plain =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** What `contentTypes.isPrivateAttribute` reads: a schema, content type or component */
type UtilsModel = Parameters<typeof contentTypesUtils.isPrivateAttribute>[0];

const isPrivate = (model: Plain, name: string) =>
  contentTypesUtils.isPrivateAttribute(model as unknown as UtilsModel, name);

/** Said of the user type, whose accounts, sessions and password hashes are never in an answer */
const USER_LOCKED_NOTE = 'Passwords, sessions and linked accounts';

const ENGINE_OWNED: ReadonlySet<string> = new Set(ENGINE_OWNED_USER_FIELDS);

/**
 * The attributes of a content type every caller reads whatever a role grants, and that are never
 * written through a field list (`publishedAt` is the Publish action's): the ones `ALWAYS_READABLE`
 * names in `@strapi/utils`' `field-rules.ts` (`:23`, applied to every read at `:776`), as admin RBAC's
 * field list leaves them out. They are not grantable fields, so they are not in the layout's. Change one,
 * change both.
 */
const ALWAYS_READABLE_ATTRIBUTES: ReadonlySet<string> = new Set([
  'createdAt',
  'updatedAt',
  'publishedAt',
  'locale',
]);

/**
 * The attributes Strapi's own schema marks private on a content type, whatever the type is: the
 * creator fields (private unless the type populates them), and `locale` and `localizations` (private
 * on a type that is not localized). They are read-only system attributes, or the Content API's own
 * locale filter, not secrets of the type, so the layout does not list them as locked rows.
 */
const SYSTEM_ATTRIBUTES: ReadonlySet<string> = new Set([
  contentTypesUtils.constants.CREATED_BY_ATTRIBUTE,
  contentTypesUtils.constants.UPDATED_BY_ATTRIBUTE,
  'locale',
  'localizations',
]);

/**
 * What a role's field list never names on a content type, whoever the role is: the attributes every
 * caller reads whatever a role grants (`ALWAYS_READABLE_ATTRIBUTES`) and the creator and translation
 * attributes no request writes (`SYSTEM_ATTRIBUTES`). The one list behind the layout and the field
 * list the Authenticated role's profile `update` row is seeded with (`bootstrap.ts`).
 */
export const NOT_GRANTABLE: ReadonlySet<string> = new Set([
  ...ALWAYS_READABLE_ATTRIBUTES,
  ...SYSTEM_ATTRIBUTES,
]);

/**
 * Relations a request never writes whatever the schema says: the creator fields and `localizations`
 * on any type, and the end user's `roles` (set by the plugin's own routes, never by a role's
 * `update`). The editor shows their Create and Update cells off.
 */
const READ_ONLY_RELATIONS: ReadonlySet<string> = new Set([
  contentTypesUtils.constants.CREATED_BY_ATTRIBUTE,
  contentTypesUtils.constants.UPDATED_BY_ATTRIBUTE,
  'localizations',
]);

const isReadOnlyAttribute = (model: Plain, prefix: string, name: string, attribute: Plain) =>
  attribute.writable === false ||
  (prefix === '' &&
    (READ_ONLY_RELATIONS.has(name) || (model.uid === USER_UID && name === 'roles')));

/**
 * The last part of a name: `global::x` is `x`, `plugin::end-users.endpoint-allowlist` is
 * `endpoint-allowlist`, `/srv/app/middlewares/audit.js` is `audit`. `fallback` is what a name with no
 * part is (`./`).
 */
const lastPart = (name: string, fallback = name) =>
  name
    .replace(/\.[cm]?[jt]s$/, '')
    .split(/::|[./\\]/)
    .findLast(Boolean) ?? fallback;

/** A name as a person reads it: `findOne` is "Find one", `end-users` is "End users" */
const readable = (name: string): string => {
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** A route that takes part in the layout, bound to one of the actions its auth names */
interface RouteEntry {
  /** The Content API's key for the route's API or plugin: `api::health`, `plugin::end-users` */
  group: string;
  actionId: string;
  method: string;
  path: string;
  rules: BoundRule[];
}

const REDACTED = '[redacted]';
const UNSERIALIZABLE = '[unserializable]';

/**
 * Keys whose value a rule's config does not show, whatever the value is: a key, a secret, a token, a
 * password or passphrase, anything of authentication, a credential, a private value, a DSN, a URL or
 * URI (which may carry credentials), a connection, a cookie, a session, a JWT, a bearer, a salt, a
 * signature, an HMAC or a webhook. A substring match, so it errs on the side of hiding.
 */
const SECRET_KEY =
  /key|secret|token|password|passwd|pass|pwd|auth|credential|private|dsn|url|uri|conn|cookie|session|jwt|bearer|salt|sign|hmac|webhook/i;

/** The longest string a rule's config shows */
const MAX_SHOWN_STRING = 64;

/**
 * What a credential looks like when it sits under an innocent key: a URL (`://`, which may carry a
 * user and a password), an authorization header (`Bearer `), or a run of 20 or more of the characters
 * a key, a token or a digest is written in (base64, base64url, hex).
 */
const CREDENTIAL_SHAPED = /:\/\/|Bearer |[A-Za-z0-9+/_-]{20,}/i;

/** A string is shown only when it is short and does not look like a credential */
const isShownString = (value: string): boolean =>
  value.length <= MAX_SHOWN_STRING && !CREDENTIAL_SHAPED.test(value);

/** How deep a config is copied: what is deeper is not shown, which also ends a cycle */
const MAX_CONFIG_DEPTH = 8;

const isPlainObject = (value: unknown): value is Plain => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
};

/**
 * A copy of a config value made only of new objects and arrays, finite numbers, booleans, null and
 * the strings `isShownString` allows, so it always serializes and is never the router's own object.
 * It is an allowlist: a string that is long or looks like a credential is `[redacted]`, and what a
 * config holds beyond the kinds above (a function, a BigInt, a symbol, a Date, a RegExp, a Map, an
 * instance of a class), what is nested deeper than `MAX_CONFIG_DEPTH`, what holds itself, and what
 * throws when it is read are `[unserializable]`. The value under a secret-like key, at any depth and
 * inside lists, is `[redacted]`, whatever it is.
 */
const toSafeValue = (value: unknown, ancestors: Set<object>, depth: number): unknown => {
  if (typeof value === 'string') {
    return isShownString(value) ? value : REDACTED;
  }

  if (value === null || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : UNSERIALIZABLE;
  }

  if (!Array.isArray(value) && !isPlainObject(value)) {
    return UNSERIALIZABLE;
  }

  if (depth >= MAX_CONFIG_DEPTH || ancestors.has(value)) {
    return UNSERIALIZABLE;
  }

  ancestors.add(value);

  try {
    if (Array.isArray(value)) {
      return Array.from(value, (item) => toSafeValue(item, ancestors, depth + 1));
    }

    const copy: Plain = {};

    for (const [key, item] of Object.entries(value)) {
      // Not a key of the copy: assigning it would set the copy's prototype
      if (item !== undefined && key !== '__proto__') {
        copy[key] = SECRET_KEY.test(key) ? REDACTED : toSafeValue(item, ancestors, depth + 1);
      }
    }

    return copy;
  } catch {
    // A getter or a proxy that throws
    return UNSERIALIZABLE;
  } finally {
    ancestors.delete(value);
  }
};

/**
 * What a rule shows of its config. An object of named settings is copied by `toSafeValue`. Anything
 * else (a string, a number, a list) has no key to say what it is, so it is never shown, only `value`.
 */
const toConfig = (value: unknown): Record<string, unknown> => {
  if (value === undefined || value === null) {
    return {};
  }

  if (isPlainObject(value)) {
    const copy = toSafeValue(value, new Set(), 0);

    return isPlainObject(copy) ? copy : { value: UNSERIALIZABLE };
  }

  return { value: REDACTED };
};

/**
 * One policy or middleware as a route lists it: a name, a function, or `{ name | resolve, config }`
 * (a policy's is `{ name, config }`). `resolve` is a module path, so only its last part is the name.
 */
const toRule = (kind: BoundRule['kind'], item: unknown): BoundRule => {
  let name = 'anonymous';
  let config: Record<string, unknown> = {};

  if (typeof item === 'string') {
    name = item;
  } else if (typeof item === 'function') {
    name = item.name || name;
  } else if (isPlain(item)) {
    if (typeof item.name === 'string') {
      name = item.name;
    } else if (typeof item.resolve === 'string') {
      name = lastPart(item.resolve, name);
    }

    config = toConfig(item.config);
  }

  return { kind, name, label: readable(lastPart(name)), config };
};

/** The rules of a route in the order they run: its policies, then its middlewares */
const rulesOf = (route: Core.Route): BoundRule[] => [
  ...(route.config?.policies ?? []).map((policy) => toRule('policy', policy)),
  ...(route.config?.middlewares ?? []).map((middleware) => toRule('middleware', middleware)),
];

/**
 * Every route a role could be granted, one entry per action it names. Left out: routes
 * with `auth: false` (the native `/api/auth/*` routes read the session themselves) and routes whose
 * scope every caller is allowed without a grant (`permissions/me`). A route with no scope (a handler
 * that is a function) has no action to grant.
 */
const routeEntries = (routesMap: Record<string, Core.Route[]>): RouteEntry[] =>
  Object.entries(routesMap).flatMap(([group, routes]) =>
    routes.flatMap((route) => {
      const auth = route.config?.auth;

      if (auth === false) {
        return [];
      }

      const rules = rulesOf(route);

      return (auth?.scope ?? [])
        .filter((scope) => !ALWAYS_ALLOWED_SCOPES.includes(scope))
        .map((actionId) => ({ group, actionId, method: route.method, path: route.path, rules }));
    })
  );

const toBoundRoute = ({ actionId, method, path, rules }: RouteEntry): BoundRoute => ({
  actionId,
  method,
  path,
  rules,
});

/** The controller and the action an action id names inside its group: `me` and `find` in `plugin::end-users.me.find` */
const splitAction = (actionId: string, group: string) => {
  const rest = actionId.startsWith(`${group}.`) ? actionId.slice(group.length + 1) : actionId;
  const cut = rest.lastIndexOf('.');

  return cut > 0
    ? { controller: rest.slice(0, cut), action: rest.slice(cut + 1) }
    : { controller: rest, action: rest };
};

/** What the layout is built once, and kept: the answer, and the bound routes of each subject in it */
interface Built {
  layout: PermissionLayout;
  /** By content type uid or route group id */
  routes: Map<string, BoundRoute[]>;
}

/**
 * `strapi.plugin('end-users').service('permission-layout')`: what the role editor is drawn from.
 * Built from the content types, the Content API route registry and the
 * condition registry, all of which are final once Strapi has started, so it is built on the first
 * call and kept until the server restarts (which is also how a condition the builder writes, or a
 * content type the Content-Type Builder changes, gets in).
 */
const permissionLayoutService = ({ strapi }: { strapi: Core.Strapi }) => {
  const permissions = () => strapi.contentAPI.permissions;

  const conditions = () =>
    (strapi.plugin(PLUGIN_ID).service('condition') as ReturnType<typeof conditionService>).list();

  const isRegistered = (actionId: string) =>
    permissions().providers.action.has(actionId) ||
    permissions().providers.syntheticAction.has(actionId);

  /** The schema registered under `uid`: only one that names itself counts, whatever the key */
  const schemaOf = (uid: string): Plain | undefined => {
    const schema: unknown = strapi.contentType(uid as UID.ContentType);

    return isPlain(schema) && schema.uid === uid ? schema : undefined;
  };

  const attributesOf = (model: Plain): Array<[string, Plain]> =>
    isPlain(model.attributes)
      ? Object.entries(model.attributes).filter((entry): entry is [string, Plain] =>
          isPlain(entry[1])
        )
      : [];

  /**
   * The fields of a schema, the non-private attributes in the schema's order. A component's own
   * attributes are its `children`, under dotted names (`seo.metaTitle`), as far down as components
   * nest; a relation, media or a dynamic zone is a leaf, and so is a component that is already open
   * above it. `engineOwned` marks the user's fields only the plugin writes, and `writable: false` the ones no request writes (see `isReadOnlyAttribute`). A content
   * type's own `createdAt`, `updatedAt`, `publishedAt` and `locale` are not fields (see
   * `ALWAYS_READABLE_ATTRIBUTES`); a component's attribute of the same name is.
   */
  const fieldsOf = (model: Plain, prefix: string, open: string[]): LayoutField[] =>
    attributesOf(model)
      .filter(
        ([name]) =>
          !isPrivate(model, name) && !(prefix === '' && ALWAYS_READABLE_ATTRIBUTES.has(name))
      )
      .map(([name, attribute]) => {
        const field: LayoutField = {
          name: `${prefix}${name}`,
          label: name,
          type: String(attribute.type),
          required: attribute.required === true,
          engineOwned: model.uid === USER_UID && ENGINE_OWNED.has(name),
          ...(isReadOnlyAttribute(model, prefix, name, attribute) && { writable: false }),
        };

        if (attribute.type === 'relation' && typeof attribute.target === 'string') {
          field.relationTarget = attribute.target;
        }

        if (
          attribute.type === 'component' &&
          typeof attribute.component === 'string' &&
          !open.includes(attribute.component)
        ) {
          const component: unknown = strapi.getModel(attribute.component as UID.Component);

          if (isPlain(component)) {
            field.children = fieldsOf(component, `${field.name}.`, [...open, attribute.component]);
          }
        }

        return field;
      });

  /**
   * The rows the editor shows locked, on the end-user type only: its private attributes (not
   * Strapi's system attributes, see `SYSTEM_ATTRIBUTES`) and its secrets. A project type's private
   * attributes are not in the layout at all: neither grantable nor locked.
   */
  const lockedOf = (model: Plain): string[] =>
    model.uid === USER_UID
      ? [
          ...attributesOf(model)
            .filter(([name]) => isPrivate(model, name) && !SYSTEM_ATTRIBUTES.has(name))
            .map(([name]) => name),
          USER_LOCKED_NOTE,
        ]
      : [];

  /**
   * What a condition's params offer on a content type. An `attribute` param with a `relationTarget`
   * offers the relations of the type to that target (what the row checks accept); one without, any
   * attribute that is not private.
   */
  const paramsOf = (
    definition: ContentApiConditionDefinition,
    uid: string,
    model: Plain
  ): LayoutConditionParam[] => {
    const extras = paramExtras(definition, builderConditionOf(strapi, definition.name));

    return Object.entries(definition.params ?? {}).map(([name, declaration]) => {
      const { accepts, createOnly } = extras.get(name) ?? {};
      const param: LayoutConditionParam = {
        name,
        type: declaration.type,
        required: declaration.required === true,
        ...(createOnly && { createOnly }),
        ...(accepts !== undefined && { accepts }),
      };

      if (declaration.default !== undefined) {
        param.default = declaration.default;
      }

      if (declaration.type === 'attribute') {
        param.options =
          typeof declaration.relationTarget === 'string'
            ? relationsTo(uid, declaration.relationTarget)
            : attributesOf(model)
                // A builder input takes one kind of field, which a row that names another is refused for
                .filter(([, attribute]) => !accepts || matchesAccepts(attribute, accepts))
                .map(([attribute]) => attribute)
                .filter((attribute) => !isPrivate(model, attribute));

        // The rule of `paramProblem` (services/permission.ts): a relation param is needed unless
        // the type has exactly one such relation, which is then the only choice
        if (typeof declaration.relationTarget === 'string' && param.options.length !== 1) {
          param.required = true;
        }
      }

      return param;
    });
  };

  const conditionsFor = (uid: string, model: Plain): LayoutCondition[] =>
    conditions()
      .filter((definition) => permissions().conditions.appliesTo(definition, uid))
      .map((definition) => ({
        name: definition.name,
        displayName: definition.displayName,
        source: definition.source ?? 'plugin',
        params: paramsOf(definition, uid, model),
      }));

  /** A content type of the layout, and the routes bound to its actions */
  const contentTypeOf = (
    uid: string,
    model: Plain,
    byAction: Map<string, RouteEntry[]>
  ): { contentType: LayoutContentType; bound: RouteEntry[] } => {
    const actions: LayoutAction[] = [];
    const bound: RouteEntry[] = [];

    for (const action of DATA_ACTIONS) {
      const actionId = `${uid}.${action}`;

      if (isRegistered(actionId)) {
        const routes = byAction.get(actionId) ?? [];

        actions.push({ action, actionId, hasRules: routes.some(({ rules }) => rules.length > 0) });
        bound.push(...routes);
      }
    }

    const { displayName } = isPlain(model.info) ? model.info : { displayName: undefined };

    return {
      contentType: {
        uid,
        label: typeof displayName === 'string' && displayName !== '' ? displayName : uid,
        kind: model.kind === 'singleType' ? 'singleType' : 'collectionType',
        actions,
        fields: fieldsOf(model, '', []),
        locked: lockedOf(model),
        conditions: conditionsFor(uid, model),
      },
      bound,
    };
  };

  /**
   * The routes that are not a data action of a content type in the layout: a plugin's or an API's own
   * (`me.find`, a health check), grouped by the API or plugin and then by controller. An action with
   * several routes is one row. The engine's types are never offered, so their routes are left out.
   */
  const groupsOf = (entries: RouteEntry[], inLayout: ReadonlySet<string>) => {
    const groups = new Map<string, Map<string, Map<string, LayoutRoute>>>();
    const routes = new Map<string, BoundRoute[]>();

    for (const entry of entries) {
      const { group, actionId, method, path, rules } = entry;
      const owner = permissions().subjectOf(actionId);
      const isColumn =
        owner !== null && inLayout.has(owner) && dataActionOf(actionId, owner) !== null;

      // A data action of a type in the layout is a column, not a route row
      if (isColumn || (owner !== null && isEngineType(owner))) {
        continue;
      }

      const { controller, action } = splitAction(actionId, group);
      const categories = groups.get(group) ?? new Map<string, Map<string, LayoutRoute>>();
      const category = categories.get(controller) ?? new Map<string, LayoutRoute>();
      const known = category.get(actionId);

      category.set(actionId, {
        actionId,
        label: readable(action),
        route: known ? `${known.route}, ${method} ${path}` : `${method} ${path}`,
        hasRules: (known?.hasRules ?? false) || rules.length > 0,
      });
      categories.set(controller, category);
      groups.set(group, categories);
      routes.set(group, [...(routes.get(group) ?? []), toBoundRoute(entry)]);
    }

    const list: LayoutRouteGroup[] = [...groups].map(([id, categories]) => ({
      id,
      kind: id.startsWith('plugin::') ? 'plugin' : 'custom',
      label: readable(id.split('::').pop() ?? id),
      categories: [...categories].map(([controller, category]) => ({
        label: readable(controller),
        routes: [...category.values()],
      })),
    }));

    return { list, routes };
  };

  const build = async (): Promise<Built> => {
    const uids = layoutContentTypeUids(strapi);
    const entries = routeEntries(await strapi.contentAPI.getRoutesMap());

    const byAction = new Map<string, RouteEntry[]>();

    for (const entry of entries) {
      byAction.set(entry.actionId, [...(byAction.get(entry.actionId) ?? []), entry]);
    }

    const routes = new Map<string, BoundRoute[]>();
    const contentTypes: LayoutContentType[] = [];

    for (const uid of uids) {
      const model = schemaOf(uid);

      if (model !== undefined) {
        const { contentType, bound } = contentTypeOf(uid, model, byAction);

        contentTypes.push(contentType);
        routes.set(uid, bound.map(toBoundRoute));
      }
    }

    const groups = groupsOf(entries, new Set(contentTypes.map(({ uid }) => uid)));

    for (const [id, bound] of groups.routes) {
      routes.set(id, bound);
    }

    return { layout: { contentTypes, groups: groups.list }, routes };
  };

  let built: Promise<Built> | undefined;

  const getBuilt = (): Promise<Built> => {
    built ??= build().catch((error) => {
      // A failed build is not kept: the next call tries again
      built = undefined;

      throw error;
    });

    return built;
  };

  return {
    /** The layout, built on the first call and kept until the server restarts */
    async getLayout(): Promise<PermissionLayout> {
      return (await getBuilt()).layout;
    },

    /**
     * The routes bound to a content type of the layout (those of its actions), or to a route group
     * of it (`plugin::end-users`, `api::health`), each with the policies and middlewares it runs.
     * Anything else is a 404.
     */
    async getRoutesFor(id: string): Promise<BoundRoute[]> {
      const found = (await getBuilt()).routes.get(id);

      if (found === undefined) {
        throw new errors.NotFoundError(`"${id}" is not a content type or a route group`);
      }

      return found;
    },
  };
};

export default permissionLayoutService;

import { engine as permissionsEngine } from '@strapi/permissions';

import { contentTypeOfAction, grantsNothing, materialize, toDataAction } from './materialize';
import { DATA_ABILITY } from './types';
import type {
  CompiledPermissions,
  ConditionUser,
  ContentApiAbility,
  ContentApiPermission,
  MaterializedPermission,
} from './types';

type Engine = ReturnType<typeof permissionsEngine.new>;
type Providers = Parameters<typeof permissionsEngine.new>[0]['providers'];

interface KeyedProvider {
  has(key: string): boolean;
}

interface GeneratorParams {
  /** The route engine: the one API tokens and Users & Permissions build their abilities with */
  engine: Engine;
  providers: Providers & { action: KeyedProvider; syntheticAction: KeyedProvider };
  /** The registered content types, keyed by uid */
  getContentTypes: () => object;
}

/**
 * What CASL's "any action" (`manage`) and "any subject" (`all`) are on the data ability: a name no
 * action and no content type uid is, as neither holds a NUL character.
 *
 * Data actions are the text after a content type's uid, so a controller method called `manage`
 * registers `api::x.x.manage` and the data action `manage`. With CASL's own wildcard that one rule
 * would answer for `find`, `delete`, `publish` and every other action, and a condition on it would
 * become the condition of all of them. On this ability `manage` and `all` are ordinary names.
 */
const NO_WILDCARD = '\u0000not-a-wildcard';

/**
 * The CASL builder of the data ability: each rule arrives with its full action and its content
 * type, and is registered as `can(dataAction, subject, fields, condition)`.
 */
const dataAbilityBuilder = (): permissionsEngine.abilities.CustomAbilityBuilder => {
  const builder = permissionsEngine.abilities.caslAbilityBuilder({
    anyAction: NO_WILDCARD,
    anySubjectType: NO_WILDCARD,
  });

  return {
    ...builder,

    can(permission) {
      const { action, subject } = permission;

      return builder.can({
        ...permission,
        action: toDataAction(action as string, subject as string),
      });
    },
  };
};

/**
 * What the data ability is built from. The engine evaluates each row's conditions for the caller
 * (`providers.condition.get({ name, params })`): a row whose conditions are all false, or all
 * unregistered, gives no data rule and fails closed; it stays in `CompiledPermissions.rules` as a
 * row the caller holds, as does a row stored under another content type than its action's, which
 * is never handed to this function. Several conditions on one row are ORed into
 * `{ $and: [{ $or: filters }] }`.
 */
const toDataPermissions = (rules: MaterializedPermission[]) =>
  rules.map(({ action, subject, fields, conditions }) => ({
    action,
    subject,
    properties: { fields: fields ?? undefined },
    conditions,
  }));

/** The data rules an ability carries, or null when `generateAbility` did not build it. */
export const compiledPermissionsOf = (auth: unknown): CompiledPermissions | null => {
  if (typeof auth !== 'object' || auth === null) {
    return null;
  }

  const { ability } = auth as { ability?: unknown };

  if (typeof ability !== 'object' || ability === null) {
    return null;
  }

  return (ability as ContentApiAbility)[DATA_ABILITY] ?? null;
};

/**
 * Whether `auth.ability` carries data rules. False for API tokens and Users & Permissions, whose
 * abilities come from `engine.generateAbility`: every subject-aware step is skipped for them.
 */
export const isSubjectAware = (auth: unknown): boolean => compiledPermissionsOf(auth) !== null;

export const createAbilityGenerator = ({ engine, providers, getContentTypes }: GeneratorParams) => {
  const isRouteAction = (action: string) => providers.action.has(action);
  const isDataAction = (action: string) =>
    providers.action.has(action) || providers.syntheticAction.has(action);

  // A second engine for the data rules. Unknown actions are dropped silently: the route engine
  // already logs every action it doesn't know
  const dataEngine = permissionsEngine.new({
    providers,
    abilityBuilderFactory: dataAbilityBuilder,
  });

  dataEngine.on(
    'before-format::validate.permission',
    ({ permission }: { permission: { action: string } }) => isDataAction(permission.action)
  );

  /**
   * Two abilities from one set of rows.
   *
   * The route ability is what `engine.generateAbility` builds from the rows' actions alone, so a
   * route scope is answered exactly as for an API token. The data ability holds the rules of the
   * rows whose subject is their action's content type, under the short action
   * (`can('find', 'api::note.note', 'title')`). In CASL a subject rule makes `can(action)` false, so
   * one ability can't answer both.
   */
  return async function generateAbility(
    permissions: ContentApiPermission[],
    options: { user: ConditionUser | null }
  ): Promise<ContentApiAbility> {
    const kept = permissions.filter((permission) => !grantsNothing(permission));

    // The same action from two roles is one route rule. `read-drafts` and `publish` are not routes,
    // so they are not handed to the route engine, which would only log them as unknown
    const routeActions = [...new Set(kept.map(({ action }) => action))].filter(
      (action) => isRouteAction(action) || !providers.syntheticAction.has(action)
    );

    const ability = (await engine.generateAbility(
      routeActions.map((action) => ({ action }))
    )) as ContentApiAbility;

    const contentTypes = getContentTypes();
    const { rules, grants } = materialize(kept, (action) =>
      contentTypeOfAction(contentTypes, action)
    );
    const user = options?.user ?? null;

    // Condition handlers read the caller from the engine's options, and the uid from the row
    const dataAbility = await dataEngine.generateAbility(toDataPermissions(grants), { user });

    // `grants` lets the checker tell a held row that may give a data rule from one that never can
    const compiled: CompiledPermissions = { ability: dataAbility, rules, grants, user };

    // Not enumerable and not writable: it is read, never copied or replaced
    Object.defineProperty(ability, DATA_ABILITY, { value: compiled });

    return ability;
  };
};

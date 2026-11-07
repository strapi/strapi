import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Core, UID } from '@strapi/types';

import { readCompatConfig } from './compat/config';
import { PROFILE_UID, USER_UID } from './constants';

const USER_EXTENSION = join('end-users', 'content-types', 'user', 'schema.json');

const LOCKED_USER_MESSAGE =
  'The end-user type is locked; add custom fields to plugin::end-users.profile instead';

const TWO_SIDED_RELATION_MESSAGE = `Relations to ${USER_UID} must be one-way (oneWay or manyWay); remove inversedBy/mappedBy`;

const PROFILE_USER_RULE = `the profile type keeps its "user" attribute as the plugin ships it: a one-way relation to ${USER_UID}, with no inversedBy or mappedBy`;

/**
 * The stored kind of a relation that gives a profile a single user. A one-way relation is stored
 * as `oneToOne` with no inverse side: `oneWay` is what the Content-Type Builder calls it, not a kind
 * the database layer knows.
 */
const ONE_WAY_TO_ONE = 'oneToOne';

type AttributeLike = {
  type?: unknown;
  relation?: unknown;
  target?: unknown;
  inversedBy?: unknown;
  mappedBy?: unknown;
};

type ContentTypesLike = Record<UID.ContentType, { attributes?: Record<string, AttributeLike> }>;

/**
 * Whether a relation has an inverse side. Like the database layer (`metadata/relations.ts`), this
 * goes by whether `inversedBy` or `mappedBy` is there at all, whatever its value: a hand-written
 * `"inversedBy": null` makes the database treat the relation as two-sided.
 */
const hasInverseSide = (attribute: AttributeLike) =>
  'inversedBy' in attribute || 'mappedBy' in attribute;

/**
 * The end-user type is locked like admin users: a project may not extend it.
 * Checks the app source and the compiled dist, so a TypeScript app is covered too.
 */
export const assertLockedUser = (strapi: Core.Strapi): void => {
  const candidates = [
    join(strapi.dirs.app.root, 'src', 'extensions', USER_EXTENSION),
    join(strapi.dirs.dist.extensions, USER_EXTENSION),
  ];

  const extension = candidates.find((file) => existsSync(file));

  if (extension) {
    throw new Error(`${extension}: ${LOCKED_USER_MESSAGE}`);
  }
};

/**
 * Other content types may point at the end-user type only with a one-way relation.
 * An inversedBy or mappedBy would add a field to the user, which project changes must never rewrite.
 */
export const assertOneWayRelations = (contentTypes: ContentTypesLike): void => {
  for (const [uid, contentType] of Object.entries(contentTypes)) {
    for (const [name, attribute] of Object.entries(contentType.attributes ?? {})) {
      const { type, target } = attribute;

      if (type !== 'relation' || target !== USER_UID) {
        continue;
      }

      if (hasInverseSide(attribute)) {
        throw new Error(`${uid} attribute "${name}": ${TWO_SIDED_RELATION_MESSAGE}`);
      }
    }
  }
};

/**
 * The profile type must still have its `user` attribute, as the plugin ships it: a relation to the
 * end user that is one-way. A project extension replaces the attribute list of a plugin type as a
 * whole, so one that drops `user` or changes it (to another target, another kind, or a relation
 * with an inverse side) would make every user create fail, because `create-profile` makes the
 * profile with the user. Refusing to start names the cause at boot instead.
 */
export const assertProfileUser = (contentTypes: ContentTypesLike): void => {
  const attribute = contentTypes[PROFILE_UID]?.attributes?.user;
  const fail = (problem: string): never => {
    throw new Error(`${PROFILE_UID} attribute "user": ${problem}; ${PROFILE_USER_RULE}`);
  };

  if (!attribute) {
    return fail('missing');
  }

  if (attribute.type !== 'relation') {
    return fail('not a one-way relation');
  }

  if (attribute.relation !== ONE_WAY_TO_ONE) {
    return fail(
      `not a one-way relation (stored as ${String(attribute.relation)}, where the plugin ships ${ONE_WAY_TO_ONE})`
    );
  }

  if (attribute.target !== USER_UID) {
    return fail(`targets ${String(attribute.target)}, not ${USER_UID}`);
  }

  if (hasInverseSide(attribute)) {
    return fail('has an inverse side (inversedBy or mappedBy)');
  }
};

/**
 * Compatibility mode answers on the routes Users & Permissions owns, so the two cannot be enabled
 * together: refusing at boot names both, instead of the routes colliding at request time.
 */
export const assertNoUsersPermissions = (strapi: Core.Strapi): void => {
  if (readCompatConfig(strapi).usersPermissions && strapi.plugin('users-permissions')) {
    throw new Error(
      'The end-users plugin has `compat.usersPermissions` on, which takes over the routes of the ' +
        'users-permissions plugin, and that plugin is still enabled. Disable users-permissions ' +
        "(`'users-permissions': { enabled: false }` in config/plugins.ts) or turn compat off."
    );
  }
};

/**
 * A connect callback is where a user lands after signing in with a provider, so its origin has to
 * be one the application trusts: the server's own or one of `trustedOrigins`. `isTrusted` is the
 * engine's own matcher (wildcards included), so this agrees with what Better Auth will accept.
 */
export const assertConnectCallbacks = async (
  strapi: Core.Strapi,
  isTrusted: (origin: string) => Promise<boolean>
): Promise<void> => {
  const { callbacks } = readCompatConfig(strapi).connect;

  for (const [provider, url] of Object.entries(callbacks)) {
    const { origin } = new URL(url);

    // eslint-disable-next-line no-await-in-loop
    if (!(await isTrusted(origin))) {
      throw new Error(
        `Invalid end-users configuration: \`compat.connect.callbacks[${JSON.stringify(provider)}]\` ` +
          `is ${JSON.stringify(url)}, whose origin ${origin} is not the server's own and is not in ` +
          '`trustedOrigins`. Add the origin to `trustedOrigins`.'
      );
    }
  }
};

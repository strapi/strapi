import { errors } from '@strapi/utils';
import type { validate } from '@strapi/utils';

import { PLUGIN_ID, USER_UID } from '../constants';

/** What `strapi.validators.add` registers: `(schema, { auth, action }) => (data) => Promise<data>` */
type Validator = validate.Validator;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * The user's fields that only Better Auth and the plugin write: whether the email is
 * verified, whether two-factor is on, the ban, the sign-in lockout, the date of the last sign-in and
 * the moment old Users & Permissions tokens were revoked. Each one changes through its own flow (the
 * verification link, the two-factor endpoints, a ban in the Content Manager), never through a
 * request that writes the user.
 *
 * This is the floor. The fields the engine declares `input: false` are added to it when the end-user
 * type is generated (a project's Better Auth plugins bring more: `phoneNumberVerified`,
 * `isAnonymous`), and `engineOwnedUserFields` reads both.
 */
export const ENGINE_OWNED_USER_FIELDS = Object.freeze([
  'emailVerified',
  'twoFactorEnabled',
  'banned',
  'banReason',
  'banExpires',
  'failedSignIns',
  'lockedUntil',
  'lastSignInAt',
  'legacyTokensRevokedAt',
] as const);

/**
 * The key under the plugin's `pluginOptions` on an attribute that marks it as one only the engine
 * and the plugin write (set when the type is generated from the engine's schema).
 */
export const ENGINE_OWNED_ATTRIBUTE_OPTION = 'engineOwned';

type AttributeMap = Record<string, { pluginOptions?: unknown } | undefined>;

const derived = new WeakMap<object, readonly string[]>();

/**
 * Every field of the end-user type only the engine and the plugin write: the static list, and each
 * attribute the type carries marked as engine-owned (`input: false` in Better Auth's merged user
 * schema). Read from the type a write is validated against, so it is the one the engine generated,
 * whichever Better Auth plugins the project installed.
 */
export const engineOwnedUserFields = (attributes?: AttributeMap): readonly string[] => {
  if (!attributes) {
    return ENGINE_OWNED_USER_FIELDS;
  }

  let fields = derived.get(attributes);

  if (!fields) {
    const marked = Object.entries(attributes)
      .filter(([, attribute]) => {
        const options = isObject(attribute?.pluginOptions)
          ? (attribute.pluginOptions as Record<string, unknown>)[PLUGIN_ID]
          : undefined;

        return isObject(options) && options[ENGINE_OWNED_ATTRIBUTE_OPTION] === true;
      })
      .map(([name]) => name);

    fields = [...new Set<string>([...ENGINE_OWNED_USER_FIELDS, ...marked])];
    derived.set(attributes, fields);
  }

  return fields;
};

/**
 * The user's relations no request writes: the roles. They change only through the
 * plugin's admin routes, so a Content API write that carries one, in any form (an array, `connect`,
 * `disconnect`, `set`, ids or documentIds, even empty), is refused whatever role the caller holds.
 * Not engine-owned: Better Auth never writes them, the plugin does.
 */
export const REQUEST_NEVER_WRITES_USER_RELATIONS = Object.freeze(['roles'] as const);

/**
 * A `content-api.input` validator, registered in `register()`: a Content API write of the end-user
 * type (REST `POST`/`PUT /api/users`) that carries one of `engineOwnedUserFields` or
 * `REQUEST_NEVER_WRITES_USER_RELATIONS` is refused, 400 naming the field, whatever role the caller holds and whatever value it sends. Other types are not
 * its business, even with attributes of the same names.
 *
 * The fields stay writable in the schema, so administrators can still ban a user or mark an email
 * verified in the Content Manager: it writes through the Document Service, which never runs a
 * Content API validator, and so do the engine and the plugin's own rules.
 *
 * It declares its parameters, so core hands it `{ auth, action }` with the schema. It refuses the
 * same for every caller, so it reads the action only: `email` is refused on every write but a
 * create.
 */
export const engineOwnedUserFieldsValidator: Validator = (schema, options) => {
  const check = async (data: unknown) => {
    if (schema?.uid !== USER_UID || !isObject(data)) {
      return data;
    }

    const attributes = (schema as { attributes?: AttributeMap }).attributes;

    for (const field of [
      ...engineOwnedUserFields(attributes),
      ...REQUEST_NEVER_WRITES_USER_RELATIONS,
    ]) {
      if (Object.hasOwn(data, field)) {
        throw new errors.ValidationError(`${field} can only be changed by the plugin`, {
          key: field,
          path: field,
        });
      }
    }

    // An address is given when a user is made and changes only through `/change-email`, which proves
    // the new one is the user's: a write of the user never sets it
    if (options?.action !== 'create' && Object.hasOwn(data, 'email')) {
      throw new errors.ValidationError('email can only be changed through /change-email', {
        key: 'email',
        path: 'email',
      });
    }

    return data;
  };

  // Core's pipeline calls it with the data alone; the registry's type is that of a lodash-curried
  // function, which is also callable that way
  return check as ReturnType<Validator>;
};

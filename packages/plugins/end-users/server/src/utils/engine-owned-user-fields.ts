import { errors } from '@strapi/utils';
import type { validate } from '@strapi/utils';

import { USER_UID } from '../constants';

/** What `strapi.validators.add` registers: `(schema, { auth, action }) => (data) => Promise<data>` */
type Validator = validate.Validator;

/**
 * The user's fields that only Better Auth and the plugin write: whether the email is
 * verified, whether two-factor is on, the ban, the sign-in lockout and the date of the last sign-in. Each one changes through its own flow (the
 * verification link, the two-factor endpoints, a ban in the Content Manager), never through a
 * request that writes the user.
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
] as const);

/**
 * The user's relations no request writes: the roles. They change only through the
 * plugin's admin routes, so a Content API write that carries one, in any form (an array, `connect`,
 * `disconnect`, `set`, ids or documentIds, even empty), is refused whatever role the caller holds.
 * Not engine-owned: Better Auth never writes them, the plugin does.
 */
export const REQUEST_NEVER_WRITES_USER_RELATIONS = Object.freeze(['roles'] as const);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * A `content-api.input` validator, registered in `register()`: a Content API write of the end-user
 * type (REST `POST`/`PUT /api/users`) that carries one of `ENGINE_OWNED_USER_FIELDS` or
 * `REQUEST_NEVER_WRITES_USER_RELATIONS` is refused, 400 naming the field, whatever role the caller holds and whatever value it sends. Other types are not
 * its business, even with attributes of the same names.
 *
 * The fields stay writable in the schema, so administrators can still ban a user or mark an email
 * verified in the Content Manager: it writes through the Document Service, which never runs a
 * Content API validator, and so do the engine and the plugin's own rules.
 *
 * It declares its parameters, so core hands it `{ auth, action }` with the schema; it
 * refuses the same for every caller, so it reads neither.
 */
export const engineOwnedUserFieldsValidator: Validator = (schema) => {
  const check = async (data: unknown) => {
    if (schema?.uid !== USER_UID || !isObject(data)) {
      return data;
    }

    for (const field of [...ENGINE_OWNED_USER_FIELDS, ...REQUEST_NEVER_WRITES_USER_RELATIONS]) {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        throw new errors.ValidationError(`${field} can only be changed by the plugin`, {
          key: field,
          path: field,
        });
      }
    }

    return data;
  };

  // Core's pipeline calls it with the data alone; the registry's type is that of a lodash-curried
  // function, which is also callable that way
  return check as ReturnType<Validator>;
};

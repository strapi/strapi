import { errors } from '@strapi/utils';
import type { Core, Modules } from '@strapi/types';

import { USER_UID } from '../constants';
import { normalizeEmail } from '../utils/normalize-email';
import { normalizeUsername } from '../utils/normalize-username';

/** The Document Service actions that write the data they are given to the user. */
const CHECKED_ACTIONS: ReadonlySet<string> = new Set(['create', 'update', 'clone']);

/** The user attributes a database unique index covers. */
const UNIQUE_FIELDS = ['email', 'username'] as const;

type UniqueField = (typeof UNIQUE_FIELDS)[number];

const takenMessage = (field: UniqueField) => `${field} is already taken`;

/**
 * `unique-user-fields`: a clear error, instead of the database's, when an email or a username is
 * already taken.
 *
 * Both are unique through a database index (`schema/to-content-types.ts` declares it), not through
 * `unique: true` on the attribute: that flag creates no index, it only makes Strapi select before it
 * writes, which is what this does, and with a message that names the field. So a user made or
 * changed anywhere but Better Auth's endpoints, in the Content Manager above all, is answered with a
 * `ValidationError` that the Content Manager shows under the field, instead of a raw constraint
 * error from the database.
 *
 * It is a check and not a lock: two writes at the same moment can both pass it, and the index still
 * refuses the second. It runs after `normalize-email`, and normalises the email again itself, so the
 * address is compared the way it is stored. The username is normalised here, the way Better Auth
 * does (`normalizeUsername`), both to compare and to store: a username written in mixed case
 * through the Document Service is stored in lower case, so Better Auth's sign-in by username (which
 * lower-cases what it is given) can find it and a second spelling of it is a duplicate.
 */
export const uniqueUserFieldsMiddleware =
  (strapi: Core.Strapi): Modules.Documents.Middleware.Middleware =>
  async (ctx, next) => {
    if (ctx.uid !== USER_UID || !CHECKED_ACTIONS.has(ctx.action)) {
      return next();
    }

    const params = ctx.params as
      { documentId?: string; data?: Record<string, unknown> | null } | undefined;

    // A copy when the username changes: the object belongs to the caller
    if (params?.data && typeof params.data.username === 'string') {
      const username = normalizeUsername(params.data.username);

      if (username !== params.data.username) {
        params.data = { ...params.data, username };
      }
    }

    const data = params?.data ?? {};
    const users = () => strapi.db.query(USER_UID);

    const values: Partial<Record<UniqueField, string>> = {};

    for (const field of UNIQUE_FIELDS) {
      const value = data[field];

      // Anything else (null, a number) is for the attribute validators to answer
      if (typeof value === 'string' && value !== '') {
        values[field] = field === 'email' ? normalizeEmail(value) : normalizeUsername(value);
      }
    }

    // A clone copies the user it is made from, so what it is not given is what the source has
    if (ctx.action === 'clone' && params?.documentId) {
      const source = (await users().findOne({
        where: { documentId: params.documentId },
        select: [...UNIQUE_FIELDS],
      })) as Partial<Record<UniqueField, string | null>> | null;

      for (const field of UNIQUE_FIELDS) {
        const value = source?.[field];

        if (!(field in data) && typeof value === 'string' && value !== '') {
          values[field] = value;
        }
      }
    }

    // An update may keep the values the user already has
    const others =
      ctx.action === 'update' && params?.documentId
        ? { documentId: { $ne: params.documentId } }
        : {};

    const taken: UniqueField[] = [];

    for (const field of UNIQUE_FIELDS) {
      const value = values[field];

      // eslint-disable-next-line no-await-in-loop
      if (
        value !== undefined &&
        (await users().findOne({ where: { [field]: value, ...others }, select: ['id'] }))
      ) {
        taken.push(field);
      }
    }

    if (taken.length > 0) {
      throw new errors.ValidationError(takenMessage(taken[0]), {
        errors: taken.map((field) => ({
          path: [field],
          message: takenMessage(field),
          name: 'ValidationError',
        })),
      });
    }

    return next();
  };

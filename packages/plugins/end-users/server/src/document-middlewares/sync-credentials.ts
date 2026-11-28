import { errors } from '@strapi/utils';
import type { Core, Modules } from '@strapi/types';

import { PLUGIN_ID, USER_UID } from '../constants';
import type { AuthEngine } from '../engine/types';

const WRITING_ACTIONS: ReadonlySet<string> = new Set(['create', 'update']);

/**
 * `sync-credentials`: a password in the data of a user write is the user's password, whoever writes
 * it (the Content Manager, a script, a migration). The user type has no password column: it lives
 * on the credential account, which the engine owns, so the value is taken out of the data and
 * handed to `engine.setPassword`, which hashes it with the same rules a sign-up uses (the length
 * limits, the hash) and creates the account or changes its password.
 *
 * The user and its password are written in one transaction: a password the engine refuses (too
 * short) fails the create, and no user is left without one. An empty password, or none, is no
 * password: a create makes a user who cannot sign in with one yet, an update changes nothing.
 *
 * An update that sets a password also ends all of the user's sessions, in the same transaction, once
 * the password is written: a password changed by an administrator, a script or a migration is
 * changed because the old one can no longer be trusted, and a session opened with it must not
 * outlive it. A create has no sessions yet, so it ends none.
 */
export const syncCredentialsMiddleware =
  (strapi: Core.Strapi): Modules.Documents.Middleware.Middleware =>
  async (ctx, next) => {
    if (ctx.uid !== USER_UID || !WRITING_ACTIONS.has(ctx.action)) {
      return next();
    }

    const params = ctx.params as
      { documentId?: string; data?: Record<string, unknown> | null } | undefined;
    const data = params?.data;

    if (!params || !data || !('password' in data)) {
      return next();
    }

    // A copy: the object belongs to the caller
    const { password, ...rest } = data;

    params.data = rest;

    if (password === undefined || password === null || password === '') {
      return next();
    }

    if (typeof password !== 'string') {
      throw new errors.ValidationError('password must be a string', {
        errors: [
          { path: ['password'], message: 'password must be a string', name: 'ValidationError' },
        ],
      });
    }

    const engine = strapi.plugin(PLUGIN_ID).service('engine').get() as AuthEngine;

    return strapi.db.transaction(async () => {
      const user = await next();
      const documentId =
        ctx.action === 'create'
          ? (user as { documentId?: string } | null | undefined)?.documentId
          : params.documentId;

      // An update of a user that is not there writes nothing, and has no one to set a password for
      if (user && documentId) {
        await engine.setPassword(documentId, password);

        if (ctx.action === 'update') {
          await engine.revokeSessions(documentId);
        }
      }

      return user;
    });
  };

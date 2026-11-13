import type { Modules } from '@strapi/types';

import { USER_UID } from '../constants';
import { normalizeEmail } from '../utils/normalize-email';

/** The Document Service actions that write the data they are given to the user. */
const WRITING_ACTIONS: ReadonlySet<string> = new Set(['create', 'update', 'clone']);

/**
 * `normalize-email`: whatever writes an end user through the Document Service (the Content Manager,
 * a lifecycle, a script, the adapter) stores the email trimmed and in lower case.
 *
 * Requests that arrive through Better Auth's endpoints are normalized earlier, by `strapi-normalize`,
 * because Better Auth validates the address before it gets here; this is the same rule for every
 * other way in. Without it `Alice@Example.com` and `alice@example.com` would be two users in a
 * database that compares strings exactly.
 */
export const normalizeEmailMiddleware: Modules.Documents.Middleware.Middleware = async (
  ctx,
  next
) => {
  if (ctx.uid === USER_UID && WRITING_ACTIONS.has(ctx.action)) {
    const params = ctx.params as { data?: Record<string, unknown> | null } | undefined;
    const data = params?.data;

    if (params && data && typeof data.email === 'string') {
      // A copy: the object belongs to the caller
      params.data = { ...data, email: normalizeEmail(data.email) };
    }
  }

  return next();
};

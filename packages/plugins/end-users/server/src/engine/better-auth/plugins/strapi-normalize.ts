/**
 * `strapi-normalize`: trims and lower-cases the email of every request before anything else reads it.
 *
 * Better Auth validates the address (`z.email()` refuses a trailing space) before the Document
 * Service middleware that normalises emails on write (`normalize-email`) ever runs, so
 * `"Alice@Example.com "` would be refused at the door rather than stored as `alice@example.com`.
 * This is the same rule, applied where Better Auth reads the request body. The plugin is first in
 * the Strapi slot so the plugins after it (roles, profile, and the project's) only see the normal
 * form.
 *
 * `newEmail` is the address `/change-email` takes; every other endpoint that takes an address
 * calls it `email`.
 */
import { createAuthMiddleware } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';

import { normalizeEmail } from '../../../utils/normalize-email';

const EMAIL_FIELDS = ['email', 'newEmail'] as const;

const isPlain = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const strapiNormalize = (): BetterAuthPlugin => ({
  id: 'strapi-normalize',
  hooks: {
    before: [
      {
        matcher: () => true,
        handler: createAuthMiddleware(async (ctx) => {
          const { body } = ctx as { body?: unknown };

          if (!isPlain(body)) {
            return;
          }

          const normalized: Record<string, unknown> = {};

          for (const field of EMAIL_FIELDS) {
            const value = body[field];

            // A value of any other type is left for Better Auth to refuse
            if (typeof value === 'string' && normalizeEmail(value) !== value) {
              normalized[field] = normalizeEmail(value);
            }
          }

          if (Object.keys(normalized).length === 0) {
            return;
          }

          return { context: { body: { ...body, ...normalized } } };
        }),
      },
    ],
  },
});
